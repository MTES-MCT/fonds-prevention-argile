# Données personnelles — inventaire par colonne

Chaque colonne du schéma Drizzle, ce qu'elle contient et ce qu'en fait la restauration d'un dump
en local (`pnpm db:restore`, cf. [db-local.md](../ops/db-local.md)). Le traitement est appliqué par
[`scripts/dev/anonymiser.sql`](../../scripts/dev/anonymiser.sql).

> **Ajouter une colonne, c'est ajouter une ligne ici.** Le test
> `src/shared/database/inventaire-donnees-personnelles.test.ts` échoue en la nommant tant qu'elle
> n'y figure pas, et vérifie que toute colonne qui n'est pas « Conservée » est bien traitée par
> le script SQL.

## Ce que la restauration garantit, et ce qu'elle ne garantit pas

Le résultat est **pseudonymisé, pas anonyme**. Noms, contacts, adresses, textes libres et jetons
sont remplacés, mais il reste des quasi-identifiants : commune, année de construction, nombre de
niveaux, revenu du ménage. Dans une petite commune, leur croisement peut suffire à retrouver un
ménage. La base locale reste donc une donnée personnelle, à traiter comme telle.

Le traitement protège la base locale : l'application lancée dessus, les captures d'écran, un agent
de code qui lit la base. Il ne protège pas le dump, qui reste en clair dans le dossier des
sauvegardes : à supprimer une fois le diagnostic terminé.

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

| Colonnes                                                                                                                                                                                                                                                                                                                             | Nature            | À la restauration                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rga_simulation_data`, `rga_simulation_data_agent`, `rga_simulation_data_agent_baseline`                                                                                                                                                                                                                                             | Quasi-identifiant | Remplacées en partie : `logement.adresse` devient `Adresse anonymisée` suivi de la commune, `logement.coordonnees` est arrondie à deux décimales (environ 1 km), `logement.clef_ban` et `logement.rnb` sont vidées. Codes géographiques, revenu et critères d'éligibilité conservés : sans eux, ni périmètre des agents ni verdict d'éligibilité |
| `rga_data_deletion_reason`                                                                                                                                                                                                                                                                                                           | Texte libre       | Remplacée par `Raison anonymisée`                                                                                                                                                                                                                                                                                                                |
| `archive_reason`                                                                                                                                                                                                                                                                                                                     | Non personnel     | Conservée : libellé de la liste fermée ou note d'inéligibilité générée, sur lesquels les statistiques filtrent à l'identique                                                                                                                                                                                                                     |
| `id`, `user_id`, `current_step`, `current_status`, `situation_particulier`, `created_at`, `updated_at`, `completed_at`, `rga_simulation_completed_at`, `rga_data_deleted_at`, `rga_simulation_agent_edited_at`, `rga_simulation_agent_edited_by`, `archived_at`, `archived_by`, `created_by_agent_id`, `vulnerabilite_simulation_id` | Non personnel     | Conservées                                                                                                                                                                                                                                                                                                                                       |

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

| Colonnes                                                                                                                                                                     | Nature        | À la restauration               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------- |
| `note`                                                                                                                                                                       | Texte libre   | Remplacée par `Note anonymisée` |
| `id`, `parcours_id`, `agent_id`, `decision`, `actions_realisees`, `raisons_ineligibilite`, `est_mandataire_financier`, `accompagnement_souhaite`, `created_at`, `updated_at` | Non personnel | Conservées                      |

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

| Colonnes                                                                                                                   | Nature             | À la restauration                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `candidats`                                                                                                                | Identifiant direct | Remplacée en partie : `nom`, `prenom`, `email` reçoivent le pseudonyme du demandeur, `adresse` devient `Adresse anonymisée` |
| `detail`                                                                                                                   | Non personnel      | Conservée : numéro du pointeur DN, écrit par l'application                                                                  |
| `id`, `ds_number`, `parcours_id`, `step`, `verdict`, `ds_state`, `observed_at`, `resolved_at`, `resolved_by`, `resolution` | Non personnel      | Conservées                                                                                                                  |

### `structures`

| Colonnes                                | Nature        | À la restauration |
| --------------------------------------- | ------------- | ----------------- |
| `id`, `nom`, `created_at`, `updated_at` | Professionnel | Conservées        |

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

| Colonnes                                                                                                                                                | Nature        | À la restauration                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `error_summary`                                                                                                                                         | Non personnel | Conservée : messages techniques, la règle de logs du projet interdit d'y écrire une donnée personnelle |
| `id`, `started_at`, `finished_at`, `status`, `triggered_by`, `total_parcours_scanned`, `total_parcours_updated`, `total_errors`, `bilan_annotations_dn` | Non personnel | Conservées                                                                                             |

### `sync_run_entries`

| Colonnes                                                                                                                                             | Nature        | À la restauration                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| `error`                                                                                                                                              | Non personnel | Conservée : même règle que `sync_runs.error_summary`           |
| `annotations_dn`                                                                                                                                     | Non personnel | Conservée : noms des annotations écrites, jamais leurs valeurs |
| `id`, `sync_run_id`, `parcours_id`, `step_before`, `step_after`, `status_before`, `status_after`, `ds_status_changes`, `step_advanced`, `created_at` | Non personnel | Conservées                                                     |

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
