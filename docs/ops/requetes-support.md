# Requêtes de support — où en est un demandeur ?

Retrouver un demandeur et lire l'état de son parcours, pour répondre à une question de
support ou reproduire un cas de QA.

> **Ces requêtes lisent des données nominatives.** Se limiter au demandeur concerné, ne pas
> exporter de listes, et n'en recopier dans un ticket ou une conversation que le strict
> nécessaire — un identifiant technique plutôt qu'une identité. Voir
> [`.claude/context/security-rules.md`](../../.claude/context/security-rules.md).

Remplacer `<EMAIL>` par l'email du demandeur. Chercher toujours sur `users.email` **et**
`users.email_contact` : FranceConnect fournit un email non modifiable (`email`), et le
demandeur peut saisir un email de contact différent (`email_contact`).

## Les tables en jeu

```
users                      ← demandeurs FranceConnect
  └─ parcours_prevention   ← 1:1 via user_id
       ├─ parcours_amo_validations       ← 1:1 via parcours_id (si une AMO est au dossier)
       └─ dossiers_demarches_simplifiees ← 1:N via parcours_id (une ligne par étape)
```

Schémas Drizzle correspondants :

- [`users.ts`](../../src/shared/database/schema/users.ts)
- [`parcours-prevention.ts`](../../src/shared/database/schema/parcours-prevention.ts)
- [`parcours-amo-validations.ts`](../../src/shared/database/schema/parcours-amo-validations.ts)
- [`dossiers-demarches-simplifiees.ts`](../../src/shared/database/schema/dossiers-demarches-simplifiees.ts)

## 1 — Fiche demandeur

```sql
SELECT u.id AS user_id, u.email, u.email_contact, u.prenom, u.nom,
       u.telephone, u.fc_id, u.last_login, u.created_at AS inscription_at
FROM users u
WHERE u.email = '<EMAIL>' OR u.email_contact = '<EMAIL>';
```

## 2 — Parcours

```sql
SELECT p.id AS parcours_id,
       p.current_step,
       p.current_status,
       p.situation_particulier,
       (p.rga_simulation_data       IS NOT NULL) AS simulation_demandeur,
       (p.rga_simulation_data_agent IS NOT NULL) AS simulation_agent,
       p.rga_simulation_completed_at,
       p.completed_at,
       p.archived_at,
       p.archive_reason,
       p.created_at,
       p.updated_at
FROM users u
INNER JOIN parcours_prevention p ON p.user_id = u.id
WHERE u.email = '<EMAIL>' OR u.email_contact = '<EMAIL>';
```

## 3 — Validation AMO (0 ou 1 ligne)

```sql
SELECT v.statut AS amo_statut,
       e.nom    AS amo_nom,
       e.siret  AS amo_siret,
       v.est_mandataire_financier,
       v.demande_arret_at,
       v.commentaire,
       v.choisie_at,
       v.validee_at
FROM users u
INNER JOIN parcours_prevention p      ON p.user_id = u.id
LEFT  JOIN parcours_amo_validations v ON v.parcours_id = p.id
LEFT  JOIN entreprises_amo e          ON e.id = v.entreprise_amo_id
WHERE u.email = '<EMAIL>' OR u.email_contact = '<EMAIL>';
```

`est_mandataire_financier` et `demande_arret_at` se lisent ensemble : une AMO mandataire
financier ne peut pas être écartée sans son accord, donc l'annulation côté demandeur pose
`demande_arret_at` et attend sa réponse au lieu de détacher tout de suite
([ADR-0018](../adr/0018-arret-accompagnement-amo.md)). Un `demande_arret_at` non nul sur un
dossier qui semble bloqué, c'est souvent ça.

Pour diagnostiquer une invitation AMO qui n'arrive pas, ajouter le suivi Brevo :
`v.email_sent_at, v.email_delivered_at, v.email_opened_at, v.email_clicked_at,
v.email_bounce_type, v.email_bounce_reason`.

## 4 — Dossiers Démarches Numériques (une ligne par étape)

```sql
SELECT d.step, d.ds_number, d.ds_status,
       d.submitted_at, d.instructed_at, d.processed_at,
       d.last_sync_at, d.ds_url, d.created_at
FROM users u
INNER JOIN parcours_prevention p            ON p.user_id = u.id
INNER JOIN dossiers_demarches_simplifiees d ON d.parcours_id = p.id
WHERE u.email = '<EMAIL>' OR u.email_contact = '<EMAIL>'
ORDER BY CASE d.step
    WHEN 'choix_amo'   THEN 1
    WHEN 'eligibilite' THEN 2
    WHEN 'diagnostic'  THEN 3
    WHEN 'devis'       THEN 4
    WHEN 'factures'    THEN 5
  END;
```

## 5 — Vue consolidée

Un coup d'œil complet : une ligne par dossier, parcours et AMO dénormalisés.

```sql
SELECT u.email, u.prenom, u.nom,
       p.current_step, p.current_status, p.situation_particulier, p.archived_at,
       v.statut AS amo_statut, e.nom AS amo_nom,
       d.step AS ds_step, d.ds_number, d.ds_status, d.submitted_at, d.processed_at
FROM users u
INNER JOIN parcours_prevention p            ON p.user_id = u.id
LEFT  JOIN parcours_amo_validations v       ON v.parcours_id = p.id
LEFT  JOIN entreprises_amo e                ON e.id = v.entreprise_amo_id
LEFT  JOIN dossiers_demarches_simplifiees d ON d.parcours_id = p.id
WHERE u.email = '<EMAIL>' OR u.email_contact = '<EMAIL>'
ORDER BY CASE d.step
    WHEN 'choix_amo'   THEN 1
    WHEN 'eligibilite' THEN 2
    WHEN 'diagnostic'  THEN 3
    WHEN 'devis'       THEN 4
    WHEN 'factures'    THEN 5
    ELSE 0
  END NULLS FIRST;
```

## Où lancer ces requêtes

En local, dans le conteneur Docker :

```bash
EMAIL="demandeur@example.org"

docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v email="$EMAIL" <<'SQL'
SELECT u.id, u.email, u.prenom, u.nom FROM users u
WHERE u.email = :'email' OR u.email_contact = :'email';
SQL
```

Sur un environnement déployé, depuis un one-off (cf. [`scalingo.md`](./scalingo.md)) :

```bash
scalingo --app fonds-argile --region osc-secnum-fr1 run bash
```

```bash
# puis, dans le conteneur
PAGER=cat psql $SCALINGO_POSTGRESQL_URL
```

## Lire les résultats

### `current_step` — étape en cours

| Valeur        | Étape                         |
| ------------- | ----------------------------- |
| `choix_amo`   | 1 — choix de l'accompagnement |
| `eligibilite` | 2 — formulaire d'éligibilité  |
| `diagnostic`  | 3 — diagnostic technique      |
| `devis`       | 4 — devis des travaux         |
| `factures`    | 5 — factures finales          |

### `current_status` — statut de l'étape en cours

| Valeur           | Signification                                                 |
| ---------------- | ------------------------------------------------------------- |
| `todo`           | au demandeur d'agir — y compris dossier déposé, voir plus bas |
| `en_instruction` | la DDT a pris le dossier en instruction                       |
| `valide`         | étape validée, l'étape suivante s'ouvre                       |

### `situation_particulier`

| Valeur     | Signification                                            |
| ---------- | -------------------------------------------------------- |
| `prospect` | compte créé, pas encore qualifié éligible                |
| `eligible` | éligible, une AMO ou un Aller-vers en est responsable    |
| `archive`  | dossier garé (`archived_at` et `archive_reason` remplis) |

### `parcours_amo_validations.statut` — décision de l'AMO

| Valeur                  | Signification                                               |
| ----------------------- | ----------------------------------------------------------- |
| `en_attente`            | AMO notifiée, n'a pas encore statué                         |
| `logement_eligible`     | logement éligible, accompagnement accepté                   |
| `logement_non_eligible` | logement hors critères                                      |
| `accompagnement_refuse` | éligible, mais cette AMO n'accompagne pas (dossier archivé) |
| `sans_amo`              | pas d'AMO au dossier — autonomie, ou responsable Aller-vers |

### `dossiers_demarches_simplifiees.ds_status`

| Valeur              | Signification                                      |
| ------------------- | -------------------------------------------------- |
| `NULL`              | formulaire créé (prérempli), **pas encore déposé** |
| `en_construction`   | **déposé**, en attente de prise en instruction     |
| `en_instruction`    | pris en instruction par la DDT                     |
| `accepte`           | accepté — l'étape passe à `valide`                 |
| `refuse`            | refusé                                             |
| `classe_sans_suite` | classé sans suite                                  |
| `non_accessible`    | dossier introuvable ou inaccessible côté API       |

**Deux pièges de lecture**, tous deux contre-intuitifs :

- `en_construction` veut dire **déposé**, pas « brouillon ». Un formulaire non déposé a
  `ds_status = NULL` et reste invisible de l'API instructeur, qui répond « Dossier not
  found » — ce n'est pas une erreur de synchro. Voir
  [ADR-0009](../adr/0009-semantique-statut-ds-depose-vs-brouillon.md) et
  [ADR-0026](../adr/0026-gel-reset-eligibilite-not-found.md).
- `refuse` et `classe_sans_suite` mappent sur `en_instruction` en interne, **pas** sur
  `todo` : un dossier refusé ne fait pas reculer l'étape. Le mapping complet est
  `DS_TO_INTERNAL_STATUS` dans
  [`ds-status.ts`](../../src/features/parcours/dossiers-ds/domain/value-objects/ds-status.ts),
  commenté dans [FLOW-AND-SYNC §3.2](../parcours/FLOW-AND-SYNC.md).

> « DS » et « DN » désignent **le même service** : `demarche.numerique.gouv.fr` est le
> nouveau nom de `demarches-simplifiees.fr`, même backend. Le code garde le préfixe `ds_`
> dans les noms de colonnes pour raisons historiques — ce ne sont pas deux intégrations
> ([ADR-0011](../adr/0011-instance-unique-ds-et-permissions-token.md)).

### Combinaisons courantes

| step / status                    | Interprétation                                                   |
| -------------------------------- | ---------------------------------------------------------------- |
| `choix_amo` / `todo`             | nouveau demandeur, doit choisir son accompagnement               |
| `choix_amo` / `en_instruction`   | AMO choisie, en attente de sa validation (`statut = en_attente`) |
| `eligibilite` / `todo`           | doit remplir ou déposer le formulaire d'éligibilité              |
| `eligibilite` / `en_instruction` | éligibilité prise en instruction par la DDT                      |
| `eligibilite` / `valide`         | éligibilité accordée, le diagnostic s'ouvre                      |

Le même schéma `todo → en_instruction → valide` se répète sur `diagnostic`, `devis` et
`factures`. Le détail des transitions est dans
[FLOW-AND-SYNC §2.1](../parcours/FLOW-AND-SYNC.md).
