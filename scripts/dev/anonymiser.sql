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

CREATE FUNCTION pg_temp.simulation(donnees jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  logement jsonb := donnees -> 'logement';
  coordonnees text := logement ->> 'coordonnees';
BEGIN
  IF jsonb_typeof(logement) IS DISTINCT FROM 'object' THEN
    RETURN donnees;
  END IF;
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
  RETURN jsonb_set(donnees, '{logement}', logement);
END $$;

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
  rga_data_deletion_reason = pg_temp.remplacer(rga_data_deletion_reason, 'Raison anonymisée');

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

UPDATE prospect_qualifications SET note = pg_temp.remplacer(note, 'Note anonymisée');

UPDATE dossiers_demarches_simplifiees SET
  ds_url = regexp_replace(ds_url, 'prefill_token=[^&#]*', 'prefill_token=anonymise', 'g'),
  chorus_tiers_fournisseur = pg_temp.remplacer(chorus_tiers_fournisseur, '0000000000'),
  chorus_numero_ej = pg_temp.remplacer(chorus_numero_ej, '0000000000')
WHERE ds_url ~ 'prefill_token=' OR chorus_tiers_fournisseur IS NOT NULL OR chorus_numero_ej IS NOT NULL;

UPDATE ds_reconciliation_observations o SET candidats = (
  SELECT coalesce(jsonb_agg(
    CASE WHEN jsonb_typeof(c) = 'object' THEN c || jsonb_build_object(
      'nom', pg_temp.remplacer(c ->> 'nom', pg_temp.code(c ->> 'userId')),
      'prenom', pg_temp.remplacer(c ->> 'prenom', 'Demandeur'),
      'email', pg_temp.remplacer(c ->> 'email', pg_temp.email('demandeur', c ->> 'userId')),
      'adresse', pg_temp.remplacer(c ->> 'adresse', 'Adresse anonymisée')
    ) ELSE c END ORDER BY rang), '[]'::jsonb)
  FROM jsonb_array_elements(o.candidats) WITH ORDINALITY AS t(c, rang)
)
WHERE jsonb_typeof(o.candidats) = 'array';

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

-- Contrôles indépendants des mises à jour : une colonne oubliée annule la transaction.
DO $$
DECLARE
  restes text[] := ARRAY[]::text[];
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email NOT LIKE '%@anonyme.invalid' OR email_contact NOT LIKE '%@anonyme.invalid'
      OR telephone <> '0600000000' OR fc_id NOT LIKE 'anonyme-%' OR prenom <> 'Demandeur') THEN
    restes := restes || 'users'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM agents WHERE NOT pg_temp.agent_conserve(email) AND email NOT LIKE '%@anonyme.invalid') THEN
    restes := restes || 'agents'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM parcours_amo_validations WHERE user_email NOT LIKE '%@anonyme.invalid'
      OR user_telephone <> '0600000000' OR brevo_message_id IS NOT NULL) THEN
    restes := restes || 'parcours_amo_validations'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM parcours_prevention p, LATERAL (VALUES (p.rga_simulation_data), (p.rga_simulation_data_agent),
      (p.rga_simulation_data_agent_baseline)) AS s(d)
      WHERE d -> 'logement' ->> 'adresse' NOT LIKE 'Adresse anonymisée%'
        OR coalesce(d -> 'logement' ->> 'rnb', '') <> '' OR coalesce(d -> 'logement' ->> 'clef_ban', '') <> '') THEN
    restes := restes || 'parcours_prevention'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM dossiers_demarches_simplifiees WHERE ds_url ~ 'prefill_token=(?!anonymise)') THEN
    restes := restes || 'dossiers_demarches_simplifiees'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM ds_reconciliation_observations o, jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.candidats) = 'array' THEN o.candidats ELSE '[]'::jsonb END) AS c
      WHERE c ->> 'email' NOT LIKE '%@anonyme.invalid') THEN
    restes := restes || 'ds_reconciliation_observations'::text;
  END IF;
  IF cardinality(restes) > 0 THEN
    RAISE EXCEPTION 'Anonymisation incomplète, rien n''a été enregistré : %', array_to_string(restes, ', ');
  END IF;
END $$;

SELECT 'Demandeurs pseudonymisés' AS donnees, count(*) AS lignes FROM users
UNION ALL SELECT 'Agents pseudonymisés', count(*) FROM agents WHERE email LIKE '%@anonyme.invalid'
UNION ALL SELECT 'Agents conservés', count(*) FROM agents WHERE pg_temp.agent_conserve(email)
UNION ALL SELECT 'Actions (messages remplacés)', count(*) FROM parcours_actions WHERE message IS NOT NULL
UNION ALL SELECT 'Liens DN neutralisés', count(*) FROM dossiers_demarches_simplifiees WHERE ds_url LIKE '%prefill_token=anonymise%';
