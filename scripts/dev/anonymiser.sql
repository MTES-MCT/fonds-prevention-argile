-- Pseudonymise une base restaurée en local : inventaire dans docs/security/DONNEES-PERSONNELLES.md.
-- Lancé par restore-db.sh en une seule transaction (psql --single-transaction) : un contrôle en échec annule tout.

-- Fin de l'identifiant : les identifiants du seed ne diffèrent qu'en fin de chaîne.
CREATE FUNCTION pg_temp.code(id text) RETURNS text LANGUAGE sql IMMUTABLE
  AS $$ SELECT upper(right(replace(id, '-', ''), 6)) $$;

-- Identifiant complet : l'unicité de l'email suit celle de l'identifiant.
CREATE FUNCTION pg_temp.email(prefixe text, id text) RETURNS text LANGUAGE sql IMMUTABLE
  AS $$ SELECT prefixe || '-' || replace(id, '-', '') || '@anonyme.invalid' $$;

CREATE FUNCTION pg_temp.jeton() RETURNS text LANGUAGE sql VOLATILE
  AS $$ SELECT md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text) $$;

-- Une valeur vide reste vide : un champ facultatif non renseigné ne devient pas renseigné.
CREATE FUNCTION pg_temp.remplacer(valeur text, par text) RETURNS text LANGUAGE sql IMMUTABLE
  AS $$ SELECT CASE WHEN valeur IS NULL THEN NULL ELSE par END $$;

-- L'équipe se connecte en local avec son propre compte ; yopmail.com porte les comptes fictifs du bac à sable.
CREATE FUNCTION pg_temp.agent_conserve(email text) RETURNS boolean LANGUAGE sql IMMUTABLE
  AS $$ SELECT email ILIKE '%@beta.gouv.fr' OR email ILIKE '%@yopmail.com' $$;

-- Codes des listes fermées gardés ; une précision libre (« autre:… ») ou une valeur inconnue ne l'est pas.
CREATE FUNCTION pg_temp.codes(valeurs text[]) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN valeurs IS NULL THEN NULL ELSE coalesce(array_agg(
    CASE WHEN v ~ '^[a-z_]+$' THEN v WHEN v LIKE 'autre:%' THEN 'autre:Précision anonymisée' ELSE 'autre' END
    ORDER BY rang), '{}') END
  FROM unnest(valeurs) WITH ORDINALITY AS t(v, rang)
$$;

-- Motifs écrits par l'application (RAISONS_ARCHIVAGE, buildEligibiliteArchiveNote) ; l'action accepte toute chaîne.
CREATE FUNCTION pg_temp.motif_archivage(raison text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  WITH
    motifs(v) AS (VALUES
      ('Le demandeur n''est pas éligible'),
      ('Reste à charge trop élevé'),
      ('Le demandeur a abandonné le projet'),
      ('Le demandeur ne donne pas de réponse'),
      ('Fausse déclaration / documents falsifiés'),
      ('Autre'),
      ('Non éligible au dispositif')),
    bases(v) AS (VALUES
      ('Non éligible (simulation auto à la création)'),
      ('Non éligible (simulation corrigée par un agent)'),
      ('Non éligible (simulation du demandeur)')),
    messages(v) AS (VALUES
      ('Le Fonds Prévention Argile concerne uniquement les maisons individuelles.'),
      ('Votre logement n''est pas situé dans une zone d''aléa argile fort.'),
      ('Votre département ne fait pas partie des 11 départements pilotes.'),
      ('Votre maison doit avoir été construite il y a au moins 15 ans.'),
      ('Votre maison ne doit pas avoir plus de 3 niveaux.'),
      ('Votre maison présente des désordres structuraux qui empêchent son usage normal : elle n''est pas éligible au dispositif.'),
      ('Le dispositif concerne uniquement les maisons non mitoyennes.'),
      ('Vos revenus dépassent les plafonds du dispositif.'),
      ('Votre maison doit être couverte par une assurance habitation.'),
      ('Vous devez être propriétaire occupant de votre résidence principale.'),
      ('Vous avez déjà été indemnisé au titre du RGA dans des conditions non compatibles.'),
      ('Vous ne pouvez pas cumuler l''aide du Fonds Prévention Argile avec une aide liée aux catastrophes naturelles.'))
  SELECT CASE
    WHEN raison IS NULL THEN NULL
    WHEN raison IN (SELECT v FROM motifs) OR raison IN (SELECT v FROM bases)
      OR raison IN (SELECT b.v || ' — ' || m.v FROM bases b, messages m) THEN raison
    -- Garde le sens « inéligible » : les statistiques et le dé-archivage automatique en dépendent.
    WHEN raison LIKE 'Non éligible%' THEN 'Non éligible au dispositif'
    ELSE 'Autre'
  END
$$;

-- Clés de RGASimulationData (rga-simulation.types.ts), avec la variante historique commune_denormanisme.
CREATE FUNCTION pg_temp.cles_simulation() RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT '{
  "logement": ["adresse", "code_region", "code_departement", "epci", "commune", "commune_nom", "coordonnees",
    "clef_ban", "commune_denormandie", "commune_denormanisme", "annee_de_construction", "rnb", "niveaux",
    "zone_dexposition", "type", "mitoyen", "proprietaire_occupant"],
  "taxeFonciere": ["commune_eligible"],
  "rga": ["assure", "indemnise_indemnise_rga", "indemnise_avant_juillet_2025", "indemnise_avant_juillet_2015",
    "indemnise_montant_indemnite", "sinistres", "demande_catnat_en_cours"],
  "menage": ["revenu_rga", "personnes"],
  "vous": ["proprietaire_condition", "proprietaire_occupant_rga"]
}'::jsonb $$;

CREATE FUNCTION pg_temp.chemin_autorise(chemin text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT chemin = 'simulatedAt'
    OR (split_part(chemin, '.', 2) <> '' AND pg_temp.cles_simulation() -> split_part(chemin, '.', 1) ? split_part(chemin, '.', 2))
$$;

-- Chemins d'une simulation sur deux niveaux : « section.cle », ou « cle » pour une valeur de premier niveau.
CREATE FUNCTION pg_temp.chemins(donnees jsonb) RETURNS SETOF text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(e.value) = 'object' THEN e.key || '.' || k.key ELSE e.key END
  FROM jsonb_each(CASE WHEN jsonb_typeof(donnees) = 'object' THEN donnees ELSE '{}' END) AS e
  LEFT JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(e.value) = 'object' THEN e.value ELSE '{}' END) AS k ON true
  WHERE jsonb_typeof(e.value) <> 'object' OR k.key IS NOT NULL
$$;

-- Reconstruite depuis les clés connues : une clé inattendue (un email glissé par un client) ne passe pas.
CREATE FUNCTION pg_temp.simulation(donnees jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  cles CONSTANT jsonb := pg_temp.cles_simulation();
  resultat jsonb := '{}';
  section record;
  logement jsonb;
  coordonnees text;
BEGIN
  IF donnees IS NULL OR jsonb_typeof(donnees) = 'null' THEN
    RETURN donnees;
  END IF;
  IF jsonb_typeof(donnees) <> 'object' THEN
    RETURN NULL;
  END IF;
  IF jsonb_typeof(donnees -> 'simulatedAt') = 'string' THEN
    resultat := jsonb_build_object('simulatedAt', donnees -> 'simulatedAt');
  END IF;
  FOR section IN SELECT key, value FROM jsonb_each(donnees) WHERE cles ? key AND jsonb_typeof(value) = 'object' LOOP
    resultat := resultat || jsonb_build_object(section.key, (
      SELECT coalesce(jsonb_object_agg(e.key, e.value), '{}')
      FROM jsonb_each(section.value) AS e
      WHERE cles -> section.key ? e.key AND jsonb_typeof(e.value) IN ('string', 'number', 'boolean', 'null')));
  END LOOP;

  logement := resultat -> 'logement';
  IF logement IS NULL THEN
    RETURN resultat;
  END IF;
  coordonnees := logement ->> 'coordonnees';
  IF jsonb_typeof(logement -> 'adresse') <> 'null' THEN
    logement := logement || jsonb_build_object('adresse', concat_ws(', ', 'Adresse anonymisée', logement ->> 'commune_nom'));
  END IF;
  IF coordonnees ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*,\s*-?[0-9]+(\.[0-9]+)?\s*$' THEN
    logement := logement || jsonb_build_object('coordonnees',
      round(trim(split_part(coordonnees, ',', 1))::numeric, 2)::text || ','
        || round(trim(split_part(coordonnees, ',', 2))::numeric, 2)::text);
  ELSIF jsonb_typeof(logement -> 'coordonnees') <> 'null' THEN
    -- Format inattendu : faute de pouvoir l'arrondir, on la retire.
    logement := logement || jsonb_build_object('coordonnees', '');
  END IF;
  IF jsonb_typeof(logement -> 'clef_ban') <> 'null' THEN
    logement := logement || jsonb_build_object('clef_ban', '');
  END IF;
  IF jsonb_typeof(logement -> 'rnb') <> 'null' THEN
    logement := logement || jsonb_build_object('rnb', '');
  END IF;
  RETURN jsonb_set(resultat, '{logement}', logement);
END $$;

-- Vérifie une simulation après traitement, sans réutiliser la fonction qui l'a produite.
CREATE FUNCTION pg_temp.simulation_propre(d jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT d IS NULL OR jsonb_typeof(d) = 'null' OR (
    jsonb_typeof(d) = 'object'
    AND NOT EXISTS (
      SELECT 1 FROM pg_temp.chemins(d) AS c
      WHERE NOT pg_temp.chemin_autorise(c)
        OR jsonb_typeof(d #> string_to_array(c, '.')) NOT IN ('string', 'number', 'boolean', 'null'))
    AND coalesce(d #>> '{logement,adresse}', 'Adresse anonymisée') LIKE 'Adresse anonymisée%'
    AND coalesce(d #>> '{logement,coordonnees}', '') ~ '^(-?[0-9]+(\.[0-9]{1,2})?,-?[0-9]+(\.[0-9]{1,2})?)?$'
    AND coalesce(d #>> '{logement,rnb}', '') = ''
    AND coalesce(d #>> '{logement,clef_ban}', '') = '')
$$;

CREATE FUNCTION pg_temp.chaine(valeur jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE
  AS $$ SELECT CASE WHEN jsonb_typeof(valeur) = 'string' THEN valeur END $$;

-- Mêmes clés que CandidatDemandeur (inspection.types.ts) ; les quatre clés personnelles reçoivent le pseudonyme.
CREATE FUNCTION pg_temp.candidats(liste jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN liste IS NULL OR jsonb_typeof(liste) = 'null' THEN liste
    WHEN jsonb_typeof(liste) <> 'array' THEN '[]'::jsonb
    ELSE (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'parcoursId', pg_temp.chaine(c -> 'parcoursId'),
        'userId', pg_temp.chaine(c -> 'userId'),
        'currentStep', pg_temp.chaine(c -> 'currentStep'),
        'nom', pg_temp.remplacer(c ->> 'nom', pg_temp.code(c ->> 'userId')),
        'prenom', pg_temp.remplacer(c ->> 'prenom', 'Demandeur'),
        'email', pg_temp.remplacer(c ->> 'email', pg_temp.email('demandeur', c ->> 'userId')),
        'adresse', pg_temp.remplacer(c ->> 'adresse', 'Adresse anonymisée'),
        'motifs', (
          SELECT coalesce(jsonb_agg(m), '[]')
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c -> 'motifs') = 'array' THEN c -> 'motifs' ELSE '[]' END) AS m
          WHERE jsonb_typeof(m) = 'string' AND m #>> '{}' ~ '^[a-z_]+$')
      ) ORDER BY rang), '[]')
      FROM jsonb_array_elements(liste) WITH ORDINALITY AS t(c, rang)
      WHERE jsonb_typeof(c) = 'object')
  END
$$;

CREATE FUNCTION pg_temp.candidats_propres(liste jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT liste IS NULL OR jsonb_typeof(liste) = 'null' OR (jsonb_typeof(liste) = 'array' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(liste) AS c
    WHERE jsonb_typeof(c) <> 'object'
      OR EXISTS (
        SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(c) = 'object' THEN c ELSE '{}' END) AS e
        WHERE e.key NOT IN ('parcoursId', 'userId', 'currentStep', 'nom', 'prenom', 'email', 'adresse', 'motifs'))
      OR coalesce(c ->> 'nom', '000000') !~ '^[0-9A-F]{6}$'
      OR coalesce(c ->> 'prenom', 'Demandeur') <> 'Demandeur'
      OR coalesce(c ->> 'email', '@anonyme.invalid') NOT LIKE '%@anonyme.invalid'
      OR coalesce(c ->> 'adresse', 'Adresse anonymisée') <> 'Adresse anonymisée'))
$$;

-- Erreurs : texte externe (DN) ou requête SQL avec ses paramètres ; seul l'identifiant du parcours reste.
CREATE FUNCTION pg_temp.resume_erreurs(resume text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN resume IS NULL THEN NULL ELSE (
    SELECT string_agg(CASE
        WHEN ligne ~ '^parcours [0-9a-f-]{36}: ' THEN substring(ligne FROM '^parcours [0-9a-f-]{36}') || ': Erreur anonymisée'
        WHEN ligne ~ '^Run zombie auto-expiré après [0-9]+ min sans finished_at\.$' THEN ligne
        ELSE 'Erreur anonymisée'
      END, E'\n' ORDER BY rang)
    FROM regexp_split_to_table(resume, E'\n') WITH ORDINALITY AS t(ligne, rang)) END
$$;

-- Avant toute mise à jour : de quoi vérifier que les jetons ont changé, et lister les clés JSONB retirées.
CREATE TEMP TABLE jetons_avant ON COMMIT DROP AS
  SELECT md5(claim_token) AS empreinte FROM users WHERE claim_token IS NOT NULL
  UNION SELECT md5(token) FROM amo_validation_tokens;

CREATE TEMP TABLE cles_retirees ON COMMIT DROP AS
  SELECT chemin, count(*) AS occurrences
  FROM parcours_prevention p,
    LATERAL (VALUES (p.rga_simulation_data), (p.rga_simulation_data_agent), (p.rga_simulation_data_agent_baseline)) AS s(d),
    LATERAL pg_temp.chemins(d) AS chemin
  WHERE chemin NOT IN (SELECT pg_temp.chemins(pg_temp.simulation(d)))
  GROUP BY chemin;

-- Demandeurs ------------------------------------------------------------------

UPDATE users SET
  prenom = pg_temp.remplacer(prenom, 'Demandeur'),
  nom = pg_temp.remplacer(nom, pg_temp.code(id::text)),
  nom_famille = pg_temp.remplacer(nom_famille, pg_temp.code(id::text)),
  email = pg_temp.remplacer(email, pg_temp.email('demandeur', id::text)),
  email_contact = CASE
    WHEN email_contact IS NULL THEN NULL
    WHEN email_contact = email THEN pg_temp.email('demandeur', id::text)
    ELSE pg_temp.email('contact', id::text)
  END,
  telephone = pg_temp.remplacer(telephone, '0600000000'),
  fc_id = pg_temp.remplacer(fc_id, 'anonyme-' || id),
  claim_token = pg_temp.remplacer(claim_token, pg_temp.jeton()),
  source_acquisition_precision = pg_temp.remplacer(source_acquisition_precision, 'Précision anonymisée');

UPDATE parcours_prevention SET
  rga_simulation_data = pg_temp.simulation(rga_simulation_data),
  rga_simulation_data_agent = pg_temp.simulation(rga_simulation_data_agent),
  rga_simulation_data_agent_baseline = pg_temp.simulation(rga_simulation_data_agent_baseline),
  rga_data_deletion_reason = pg_temp.remplacer(rga_data_deletion_reason, 'Raison anonymisée'),
  archive_reason = pg_temp.motif_archivage(archive_reason);

UPDATE parcours_amo_validations v SET
  user_prenom = pg_temp.remplacer(v.user_prenom, 'Demandeur'),
  user_nom = pg_temp.remplacer(v.user_nom, pg_temp.code(p.user_id::text)),
  user_email = pg_temp.remplacer(v.user_email, pg_temp.email('demandeur', p.user_id::text)),
  user_telephone = pg_temp.remplacer(v.user_telephone, '0600000000'),
  adresse_logement = pg_temp.remplacer(v.adresse_logement, 'Adresse anonymisée'),
  commentaire = pg_temp.remplacer(v.commentaire, 'Commentaire anonymisé'),
  email_bounce_reason = pg_temp.remplacer(v.email_bounce_reason, 'Motif anonymisé'),
  brevo_message_id = NULL
FROM parcours_prevention p
WHERE p.id = v.parcours_id;

UPDATE amo_validation_tokens SET token = pg_temp.jeton();

UPDATE prospect_qualifications SET
  note = pg_temp.remplacer(note, 'Note anonymisée'),
  raisons_ineligibilite = pg_temp.codes(raisons_ineligibilite),
  actions_realisees = pg_temp.codes(actions_realisees);

UPDATE dossiers_demarches_simplifiees SET
  ds_url = regexp_replace(ds_url, 'prefill_token=[^&#]*', 'prefill_token=anonymise', 'g'),
  chorus_tiers_fournisseur = pg_temp.remplacer(chorus_tiers_fournisseur, '0000000000'),
  chorus_numero_ej = pg_temp.remplacer(chorus_numero_ej, '0000000000')
WHERE ds_url ~ 'prefill_token=' OR chorus_tiers_fournisseur IS NOT NULL OR chorus_numero_ej IS NOT NULL;

UPDATE ds_reconciliation_observations SET candidats = pg_temp.candidats(candidats) WHERE candidats IS NOT NULL;

UPDATE sync_run_entries SET error = pg_temp.remplacer(error, 'Erreur anonymisée') WHERE error IS NOT NULL;

UPDATE sync_runs SET error_summary = pg_temp.resume_erreurs(error_summary) WHERE error_summary IS NOT NULL;

-- Agents ----------------------------------------------------------------------

UPDATE agents SET
  given_name = 'Agent',
  usual_name = pg_temp.code(id::text),
  email = pg_temp.email('agent', id::text),
  sub = 'anonyme-' || id,
  uid = pg_temp.remplacer(uid, 'anonyme-' || id),
  phone = pg_temp.remplacer(phone, '0600000000'),
  desactive_raison = pg_temp.remplacer(desactive_raison, 'Raison anonymisée')
WHERE NOT pg_temp.agent_conserve(email);

-- Après les agents : le nom d'un agent conservé reste le sien.
UPDATE parcours_actions a SET
  author_name = CASE
    WHEN a.agent_id IS NOT NULL THEN coalesce(
      (SELECT CASE WHEN pg_temp.agent_conserve(ag.email) THEN a.author_name ELSE 'Agent ' || ag.usual_name END
       FROM agents ag WHERE ag.id = a.agent_id),
      'Auteur anonymisé')
    WHEN a.author_structure_type = 'DEMANDEUR' THEN
      'Demandeur ' || (SELECT pg_temp.code(p.user_id::text) FROM parcours_prevention p WHERE p.id = a.parcours_id)
    ELSE 'Auteur anonymisé'
  END,
  message = pg_temp.remplacer(a.message, 'Message anonymisé'),
  action_precision = pg_temp.remplacer(a.action_precision, 'Précision anonymisée');

-- Contrôles sur les valeurs finales, colonne par colonne : un UPDATE oublié ou sans effet annule la transaction.
DO $$
DECLARE
  restes text[] := ARRAY[]::text[];
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE prenom <> 'Demandeur' OR nom !~ '^[0-9A-F]{6}$' OR nom_famille !~ '^[0-9A-F]{6}$'
      OR email NOT LIKE '%@anonyme.invalid' OR email_contact NOT LIKE '%@anonyme.invalid' OR telephone <> '0600000000'
      OR fc_id NOT LIKE 'anonyme-%' OR md5(claim_token) IN (SELECT empreinte FROM jetons_avant)
      OR source_acquisition_precision <> 'Précision anonymisée') THEN
    restes := restes || 'users'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM agents WHERE NOT pg_temp.agent_conserve(email) AND (email NOT LIKE '%@anonyme.invalid'
      OR given_name <> 'Agent' OR usual_name !~ '^[0-9A-F]{6}$' OR sub NOT LIKE 'anonyme-%' OR uid NOT LIKE 'anonyme-%'
      OR phone <> '0600000000' OR desactive_raison <> 'Raison anonymisée')) THEN
    restes := restes || 'agents'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM parcours_prevention WHERE NOT pg_temp.simulation_propre(rga_simulation_data)
      OR NOT pg_temp.simulation_propre(rga_simulation_data_agent)
      OR NOT pg_temp.simulation_propre(rga_simulation_data_agent_baseline)
      OR rga_data_deletion_reason <> 'Raison anonymisée'
      OR archive_reason IS DISTINCT FROM pg_temp.motif_archivage(archive_reason)) THEN
    restes := restes || 'parcours_prevention'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM parcours_amo_validations WHERE user_prenom <> 'Demandeur' OR user_nom !~ '^[0-9A-F]{6}$'
      OR user_email NOT LIKE '%@anonyme.invalid' OR user_telephone <> '0600000000'
      OR adresse_logement <> 'Adresse anonymisée' OR commentaire <> 'Commentaire anonymisé'
      OR email_bounce_reason <> 'Motif anonymisé' OR brevo_message_id IS NOT NULL) THEN
    restes := restes || 'parcours_amo_validations'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM amo_validation_tokens WHERE md5(token) IN (SELECT empreinte FROM jetons_avant)) THEN
    restes := restes || 'amo_validation_tokens'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM prospect_qualifications WHERE note <> 'Note anonymisée'
      OR raisons_ineligibilite IS DISTINCT FROM pg_temp.codes(raisons_ineligibilite)
      OR actions_realisees IS DISTINCT FROM pg_temp.codes(actions_realisees)
      OR EXISTS (SELECT 1 FROM unnest(raisons_ineligibilite || actions_realisees) AS v
        WHERE v LIKE 'autre:%' AND v <> 'autre:Précision anonymisée')) THEN
    restes := restes || 'prospect_qualifications'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM parcours_actions a WHERE coalesce(a.message, 'Message anonymisé') <> 'Message anonymisé'
      OR coalesce(a.action_precision, 'Précision anonymisée') <> 'Précision anonymisée'
      OR (a.author_name <> 'Auteur anonymisé' AND a.author_name !~ '^(Agent|Demandeur) [0-9A-F]{6}$'
        AND NOT EXISTS (SELECT 1 FROM agents ag WHERE ag.id = a.agent_id AND pg_temp.agent_conserve(ag.email)))) THEN
    restes := restes || 'parcours_actions'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM dossiers_demarches_simplifiees WHERE ds_url ~ 'prefill_token=(?!anonymise(&|#|$))'
      OR chorus_tiers_fournisseur <> '0000000000' OR chorus_numero_ej <> '0000000000') THEN
    restes := restes || 'dossiers_demarches_simplifiees'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM ds_reconciliation_observations WHERE NOT pg_temp.candidats_propres(candidats)) THEN
    restes := restes || 'ds_reconciliation_observations'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM sync_run_entries WHERE error <> 'Erreur anonymisée') THEN
    restes := restes || 'sync_run_entries'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM sync_runs WHERE error_summary IS DISTINCT FROM pg_temp.resume_erreurs(error_summary)) THEN
    restes := restes || 'sync_runs'::text;
  END IF;
  IF cardinality(restes) > 0 THEN
    RAISE EXCEPTION 'Anonymisation incomplète, rien n''a été enregistré : %', array_to_string(restes, ', ');
  END IF;
END $$;

SELECT donnees, lignes FROM (
  SELECT 1 AS ordre, 'Demandeurs pseudonymisés' AS donnees, count(*) AS lignes FROM users
  UNION ALL SELECT 2, 'Agents pseudonymisés', count(*) FROM agents WHERE email LIKE '%@anonyme.invalid'
  UNION ALL SELECT 3, 'Agents conservés', count(*) FROM agents WHERE pg_temp.agent_conserve(email)
  UNION ALL SELECT 4, 'Actions (messages remplacés)', count(*) FROM parcours_actions WHERE message IS NOT NULL
  UNION ALL SELECT 5, 'Liens DN neutralisés', count(*) FROM dossiers_demarches_simplifiees WHERE ds_url LIKE '%prefill_token=anonymise%'
  UNION ALL SELECT 6, 'Simulation, clé retirée (inconnue ou non scalaire) : ' || chemin, occurrences FROM cles_retirees
) AS bilan ORDER BY ordre, donnees;
