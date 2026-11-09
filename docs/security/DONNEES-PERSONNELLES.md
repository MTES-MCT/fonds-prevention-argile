# Données personnelles — inventaire par colonne

Chaque colonne du schéma Drizzle, ce qu'elle contient et ce qu'en fait la restauration d'un dump
en local (`pnpm db:restore`, cf. [db-local.md](../ops/db-local.md)). Le traitement est appliqué par
[`scripts/dev/anonymiser.sql`](../../scripts/dev/anonymiser.sql).

> **Toute modification du modèle de données revérifie cette page et le script.** Le test
> `src/shared/database/inventaire-donnees-personnelles.test.ts` échoue en nommant une colonne
> absente d'ici, ou qui n'est pas « Conservée » sans être traitée puis contrôlée par le script SQL,
> ainsi qu'une clé de `RGASimulationData` absente de la liste du script. Il ne voit ni une autre clé
> JSONB, ni un nouveau contenu écrit dans une colonne « Conservée » (un message système qui
> recopierait un nom) : ces cas se vérifient à la main.

## Ce que la restauration garantit, et ce qu'elle ne garantit pas

Le résultat est **pseudonymisé, pas anonyme**. Noms, contacts, adresses, textes libres et jetons
sont remplacés, mais il reste des quasi-identifiants : commune, année de construction, nombre de
niveaux, revenu du ménage. Dans une petite commune, leur croisement peut suffire à retrouver un
ménage. La base locale reste donc une donnée personnelle, à traiter comme telle.

Le traitement protège la base locale : l'application lancée dessus, les captures d'écran, un agent
de code qui lit la base. Les tables modifiées sont réécrites (`VACUUM FULL`) : un `UPDATE` laisse
sinon l'ancienne ligne, en clair, dans les fichiers de la table et de ses index. Restauration et
pseudonymisation tiennent dans une seule transaction, et le conteneur du dépôt réduit le journal
d'écriture de PostgreSQL au minimum (`wal_level=minimal`) : le dump n'y est donc jamais écrit. Reste
une trace hors de la base : le dump lui-même, en clair dans le dossier des sauvegardes, à supprimer
une fois le diagnostic terminé.

Trois colonnes donnent un **droit d'accès en production** et pas seulement une information :
le lien de préremplissage DN (qui l'ouvre devient propriétaire du brouillon), le jeton
d'invitation et le jeton de validation AMO. Elles sont remplacées dans tous les cas.

## Règles de remplacement

- **Dérivé de l'identifiant de la ligne** : `Demandeur 3F9A2C`, `Agent 3F9A2C`,
  `demandeur-3f9a2c4d5e6f@anonyme.invalid`. Le résultat est stable d'une restauration à l'autre,
  les contraintes d'unicité tiennent, et un demandeur garde le même pseudonyme partout où il
  apparaît (compte, validation AMO, observation de réconciliation). Le domaine `.invalid` ne peut
  jamais recevoir de mail (RFC 2606).
- **Une valeur vide reste vide** : un champ facultatif non renseigné ne devient pas renseigné.
- **Agents conservés** : les comptes en `@beta.gouv.fr` (l'équipe, pour se connecter en local avec
  son propre compte) et en `@yopmail.com` (comptes du bac à sable ProConnect, fictifs). Tous les
  autres sont pseudonymisés.
- **JSONB reconstruit depuis les clés connues** : une clé inattendue (une adresse ou un email glissé
  dans la simulation par un client) est retirée et comptée dans le bilan de la restauration.
- **Codes géographiques conservés** : région, département, EPCI et commune font le périmètre des
  agents. Les remplacer viderait l'espace agent.

## Natures

| Nature             | Exemple                                                   |
| ------------------ | --------------------------------------------------------- |
| Identifiant direct | nom, email, téléphone, identifiant FranceConnect          |
| Quasi-identifiant  | adresse, coordonnées, revenu, année de construction       |
| Texte libre        | commentaire, note, message : peut contenir n'importe quoi |
| Droit d'accès      | jeton qui permet d'agir en production                     |
| Professionnel      | coordonnées d'une structure, publiées sur le site         |
| Non personnel      | identifiant technique, statut, date, code                 |

## Tables

### `users`

| Colonnes                                                                                                                       | Nature             | À la restauration                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `prenom`, `nom`, `nom_famille`                                                                                                 | Identifiant direct | Remplacées : `Demandeur` et 6 caractères de l'identifiant                                                    |
| `email`, `email_contact`                                                                                                       | Identifiant direct | Remplacées par une adresse `@anonyme.invalid` ; un email de contact égal à l'email reçoit le même pseudonyme |
| `telephone`                                                                                                                    | Identifiant direct | Remplacée par `0600000000`                                                                                   |
| `fc_id`                                                                                                                        | Identifiant direct | Remplacée par `anonyme-<id>` : identifiant FranceConnect de la personne                                      |
| `claim_token`                                                                                                                  | Droit d'accès      | Remplacée par un jeton aléatoire : il rattache une invitation en production                                  |
| `source_acquisition_precision`                                                                                                 | Texte libre        | Remplacée par `Précision anonymisée`                                                                         |
| `id`, `source_acquisition`, `partner_source`, `claim_token_expires_at`, `claimed_at`, `last_login`, `created_at`, `updated_at` | Non personnel      | Conservées                                                                                                   |

### `agents`

Les agents conservés (`@beta.gouv.fr`, `@yopmail.com`) ne sont pas touchés.

| Colonnes                                                                                                                                       | Nature             | À la restauration                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `given_name`, `usual_name`                                                                                                                     | Identifiant direct | Remplacées : `Agent` et 6 caractères de l'identifiant                  |
| `email`                                                                                                                                        | Identifiant direct | Remplacée par une adresse `@anonyme.invalid`                           |
| `sub`, `uid`                                                                                                                                   | Identifiant direct | Remplacées par `anonyme-<id>` : identifiants ProConnect de la personne |
| `phone`                                                                                                                                        | Identifiant direct | Remplacée par `0600000000`                                             |
| `desactive_raison`                                                                                                                             | Texte libre        | Remplacée par `Raison anonymisée`                                      |
| `siret`, `organizational_unit`                                                                                                                 | Professionnel      | Conservées : structure de l'agent, pas sa personne                     |
| `id`, `structure_id`, `role`, `entreprise_amo_id`, `allers_vers_id`, `desactive_at`, `desactive_par`, `last_login`, `created_at`, `updated_at` | Non personnel      | Conservées                                                             |

### `parcours_prevention`

| Colonnes                                                                                                                                                                                                                                                                                                                             | Nature            | À la restauration                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rga_simulation_data`, `rga_simulation_data_agent`, `rga_simulation_data_agent_baseline`                                                                                                                                                                                                                                             | Quasi-identifiant | Remplacées en partie : reconstruites depuis les clés de `RGASimulationData`, toute autre clé est retirée. `logement.adresse` devient `Adresse anonymisée` suivi de la commune, `logement.coordonnees` est arrondie à deux décimales (environ 1 km), `logement.clef_ban` et `logement.rnb` sont vidées. Codes géographiques, revenu et critères d'éligibilité conservés : sans eux, ni périmètre des agents ni verdict d'éligibilité |
| `rga_data_deletion_reason`                                                                                                                                                                                                                                                                                                           | Texte libre       | Remplacée par `Raison anonymisée`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `archive_reason`                                                                                                                                                                                                                                                                                                                     | Texte libre       | Remplacée si inconnue : un motif de la liste ou une note d'inéligibilité générée par l'application est gardé (les statistiques filtrent dessus à l'identique) ; tout autre texte devient `Non éligible au dispositif` s'il commence par « Non éligible », `Autre` sinon. L'action d'archivage accepte n'importe quelle chaîne                                                                                                       |
| `id`, `user_id`, `current_step`, `current_status`, `situation_particulier`, `created_at`, `updated_at`, `completed_at`, `rga_simulation_completed_at`, `rga_data_deleted_at`, `rga_simulation_agent_edited_at`, `rga_simulation_agent_edited_by`, `archived_at`, `archived_by`, `created_by_agent_id`, `vulnerabilite_simulation_id` | Non personnel     | Conservées                                                                                                                                                                                                                                                                                                                                                                                                                          |

### `parcours_amo_validations`

| Colonnes                                                                                                                                                                                                                                                                          | Nature             | À la restauration                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `user_prenom`, `user_nom`, `user_email`, `user_telephone`                                                                                                                                                                                                                         | Identifiant direct | Remplacées par le pseudonyme du demandeur du parcours                      |
| `adresse_logement`                                                                                                                                                                                                                                                                | Quasi-identifiant  | Remplacée par `Adresse anonymisée`                                         |
| `commentaire`                                                                                                                                                                                                                                                                     | Texte libre        | Remplacée par `Commentaire anonymisé`                                      |
| `email_bounce_reason`                                                                                                                                                                                                                                                             | Texte libre        | Remplacée par `Motif anonymisé` : le motif de rejet cite souvent l'adresse |
| `brevo_message_id`                                                                                                                                                                                                                                                                | Identifiant direct | Vidée : retrouve l'email dans les journaux Brevo                           |
| `id`, `parcours_id`, `entreprise_amo_id`, `statut`, `attribution_mode`, `est_mandataire_financier`, `demande_arret_at`, `email_sent_at`, `email_delivered_at`, `email_opened_at`, `email_clicked_at`, `email_bounce_type`, `choisie_at`, `validee_at`, `created_at`, `updated_at` | Non personnel      | Conservées                                                                 |

### `amo_validation_tokens`

| Colonnes                                                                  | Nature        | À la restauration                                                                      |
| ------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| `token`                                                                   | Droit d'accès | Remplacée par un jeton aléatoire : il valide une demande au nom de l'AMO en production |
| `id`, `parcours_amo_validation_id`, `created_at`, `expires_at`, `used_at` | Non personnel | Conservées                                                                             |

### `parcours_actions`

| Colonnes                                                                                            | Nature             | À la restauration                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `author_name`                                                                                       | Identifiant direct | Remplacée par le pseudonyme de l'auteur : agent, ou demandeur pour une action qu'il a faite ; `Auteur anonymisé` pour un agent supprimé. Conservée pour un agent conservé |
| `message`, `action_precision`                                                                       | Texte libre        | Remplacées par `Message anonymisé` et `Précision anonymisée`                                                                                                              |
| `author_structure`, `author_structure_type`                                                         | Professionnel      | Conservées                                                                                                                                                                |
| `id`, `parcours_id`, `agent_id`, `action_type`, `rdv_date`, `created_at`, `updated_at`, `edited_at` | Non personnel      | Conservées                                                                                                                                                                |

### `prospect_qualifications`

| Colonnes                                                                                                                       | Nature        | À la restauration                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `note`                                                                                                                         | Texte libre   | Remplacée par `Note anonymisée`                                                                                                                                  |
| `raisons_ineligibilite`, `actions_realisees`                                                                                   | Texte libre   | Remplacées en partie : les codes sont gardés, la précision d'un `autre:…` saisie par l'agent devient `Précision anonymisée`, une valeur inconnue devient `autre` |
| `id`, `parcours_id`, `agent_id`, `decision`, `est_mandataire_financier`, `accompagnement_souhaite`, `created_at`, `updated_at` | Non personnel | Conservées                                                                                                                                                       |

### `dossiers_demarches_simplifiees`

| Colonnes                                                                                                                                                                                                                                                                                                                                                                     | Nature             | À la restauration                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `ds_url`                                                                                                                                                                                                                                                                                                                                                                     | Droit d'accès      | Remplacée en partie : la valeur de `prefill_token` devient `anonymise`             |
| `chorus_tiers_fournisseur`, `chorus_numero_ej`                                                                                                                                                                                                                                                                                                                               | Identifiant direct | Remplacées par `0000000000` : le tiers fournisseur désigne la personne dans Chorus |
| `ds_number`, `ds_id`                                                                                                                                                                                                                                                                                                                                                         | Non personnel      | Conservées : utiles au diagnostic, illisibles sans accès instructeur à DN          |
| `chorus_montant_subvention`                                                                                                                                                                                                                                                                                                                                                  | Non personnel      | Conservée : se déduit de la tranche de revenus                                     |
| `id`, `parcours_id`, `step`, `ds_demarche_id`, `ds_status`, `submitted_at`, `instructed_at`, `processed_at`, `created_at`, `updated_at`, `last_sync_at`, `dn_probe_state`, `dn_probe_at`, `initie_par`, `avis_impot_controle_at`, `avis_impot_statut`, `avis_impot_champs_modifies_at`, `chorus_tiers_fournisseur_at`, `chorus_numero_ej_at`, `chorus_montant_subvention_at` | Non personnel      | Conservées                                                                         |

### `dossiers_ds_tentatives`

| Colonnes                                                                                                   | Nature        | À la restauration |
| ---------------------------------------------------------------------------------------------------------- | ------------- | ----------------- |
| `id`, `parcours_id`, `step`, `ds_number`, `ds_id`, `ds_demarche_id`, `origine`, `created_at`, `updated_at` | Non personnel | Conservées        |

### `ds_reconciliation_observations`

| Colonnes                                                                                                                   | Nature             | À la restauration                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `candidats`                                                                                                                | Identifiant direct | Remplacée en partie : reconstruite depuis les clés de `CandidatDemandeur` ; `nom`, `prenom`, `email` reçoivent le pseudonyme du demandeur, `adresse` devient `Adresse anonymisée` |
| `detail`                                                                                                                   | Non personnel      | Conservée : numéro du pointeur DN, écrit par l'application                                                                                                                        |
| `id`, `ds_number`, `parcours_id`, `step`, `verdict`, `ds_state`, `observed_at`, `resolved_at`, `resolved_by`, `resolution` | Non personnel      | Conservées                                                                                                                                                                        |

### `structures`

| Colonnes                                           | Nature        | À la restauration                                            |
| -------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| `nom`, `siret`, `adresse`, `telephone`, `horaires` | Professionnel | Conservées : coordonnées publiées aux demandeurs sur le site |
| `id`, `type`, `created_at`, `updated_at`           | Non personnel | Conservées                                                   |

> Depuis ADR-0053, l'identité vit sur la structure et se recopie sur ses lignes `entreprises_amo`,
> `allers_vers` et `experts` : les deux copies sont de même nature et conservées ensemble.

### `entreprises_amo`

| Colonnes                                                                     | Nature        | À la restauration                                            |
| ---------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| `nom`, `siret`, `departements`, `emails`, `telephone`, `adresse`, `horaires` | Professionnel | Conservées : coordonnées publiées aux demandeurs sur le site |
| `id`, `structure_id`, `created_at`, `updated_at`                             | Non personnel | Conservées                                                   |

### `entreprises_amo_communes`

| Colonnes                          | Nature        | À la restauration |
| --------------------------------- | ------------- | ----------------- |
| `entreprise_amo_id`, `code_insee` | Non personnel | Conservées        |

### `entreprises_amo_epci`

| Colonnes                         | Nature        | À la restauration |
| -------------------------------- | ------------- | ----------------- |
| `entreprise_amo_id`, `code_epci` | Non personnel | Conservées        |

### `allers_vers`

| Colonnes                                            | Nature        | À la restauration                                            |
| --------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| `nom`, `emails`, `telephone`, `adresse`, `horaires` | Professionnel | Conservées : coordonnées publiées aux demandeurs sur le site |
| `id`, `structure_id`                                | Non personnel | Conservées                                                   |

### `allers_vers_departements`

| Colonnes                             | Nature        | À la restauration |
| ------------------------------------ | ------------- | ----------------- |
| `allers_vers_id`, `code_departement` | Non personnel | Conservées        |

### `allers_vers_epci`

| Colonnes                      | Nature        | À la restauration |
| ----------------------------- | ------------- | ----------------- |
| `allers_vers_id`, `code_epci` | Non personnel | Conservées        |

### `experts`

Experts RGA validés par la DHUP, sans compte (ADR-0052). Absente d'un dump antérieur à la migration
0060 : le script ne la traite que si elle existe.

| Colonnes                                                                                                  | Nature             | À la restauration                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contact_interne_nom`, `contact_interne_email`, `contact_interne_telephone`                               | Identifiant direct | Remplacées par `Contact anonymisé`, une adresse `@anonyme.invalid` et `0600000000` : contact réservé au super-administrateur, souvent une personne |
| `desactive_raison`                                                                                        | Texte libre        | Remplacée par `Raison anonymisée`                                                                                                                  |
| `nom`, `siret`                                                                                            | Professionnel      | Conservées : raison sociale et SIRET de l'entreprise, comme pour une AMO                                                                           |
| `id`, `date_validation_dhup`, `structure_id`, `desactive_at`, `desactive_par`, `created_at`, `updated_at` | Non personnel      | Conservées                                                                                                                                         |

### `experts_departements`

| Colonnes                        | Nature        | À la restauration                                                                       |
| ------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| `email`, `telephone`            | Professionnel | Conservées : contact de réservation communiqué aux agents, traité comme celui d'une AMO |
| `expert_id`, `code_departement` | Non personnel | Conservées                                                                              |

### `agent_permissions`

| Colonnes                                           | Nature        | À la restauration |
| -------------------------------------------------- | ------------- | ----------------- |
| `id`, `agent_id`, `departement_code`, `created_at` | Non personnel | Conservées        |

### `vulnerabilite_simulations`

Table anonyme par construction : aucun lien vers un compte, seul le département est gardé (ADR-0031).

| Colonnes                                                                                                                                                                                                                                              | Nature        | À la restauration |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------- |
| `id`, `created_at`, `code_departement`, `alea_rga`, `pente_terrain`, `reseaux_enterres`, `gravier_proprete`, `gouttieres`, `recuperateur_eau`, `arbre_proximite`, `arbre_essence`, `haies`, `vegetation_pied_facade`, `mitoyennete`, `ensoleillement` | Non personnel | Conservées        |

### `sync_runs`

| Colonnes                                                                                                                                                | Nature        | À la restauration                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error_summary`                                                                                                                                         | Texte libre   | Remplacée ligne à ligne : seul `parcours <id>` reste devant `Erreur anonymisée`. Le message vient de DN ou d'une requête SQL en échec, avec ses paramètres |
| `id`, `started_at`, `finished_at`, `status`, `triggered_by`, `total_parcours_scanned`, `total_parcours_updated`, `total_errors`, `bilan_annotations_dn` | Non personnel | Conservées                                                                                                                                                 |

### `sync_run_entries`

| Colonnes                                                                                                                                             | Nature        | À la restauration                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `error`                                                                                                                                              | Texte libre   | Remplacée par `Erreur anonymisée` : même origine que `sync_runs.error_summary`. Le diagnostic ne lit que sa présence |
| `annotations_dn`                                                                                                                                     | Non personnel | Conservée : noms des annotations écrites, jamais leurs valeurs                                                       |
| `id`, `sync_run_id`, `parcours_id`, `step_before`, `step_after`, `status_before`, `status_after`, `ds_status_changes`, `step_advanced`, `created_at` | Non personnel | Conservées                                                                                                           |

### `catastrophes_naturelles`

| Colonnes                                                                                                                                                                                     | Nature        | À la restauration               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------- |
| `code_national_catnat`, `date_debut_evt`, `date_fin_evt`, `date_publication_arrete`, `date_publication_jo`, `libelle_risque_jo`, `code_insee`, `libelle_commune`, `created_at`, `updated_at` | Non personnel | Conservées : référentiel public |

### `rga_zones`

| Colonnes     | Nature        | À la restauration                                            |
| ------------ | ------------- | ------------------------------------------------------------ |
| `id`, `alea` | Non personnel | Conservées : référentiel public, la géométrie (`geom`) aussi |

## Hors du schéma Drizzle

Présentes dans un dump, sans donnée personnelle : `rga_zones_import` (table de travail de l'import
des zones), les tables de PostGIS (`spatial_ref_sys`, vues `geometry_columns` et
`geography_columns`) et `drizzle.__drizzle_migrations` (historique des migrations).
