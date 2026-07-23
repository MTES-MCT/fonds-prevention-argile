# Ops — audit, fix, debug, cleanup

Utilitaires pour intervenir sur une BDD existante : audit d'intégrité, correction ponctuelle, debug d'un comportement. Pas de seed ici (cf. [`../seed/`](../seed/README.md)).

> Tous les scripts read-only par défaut. Ceux qui écrivent ont un mode `--dry-run` pour prévisualiser avant d'appliquer.

## Exécution sur Scalingo

Les scripts tournent dans un conteneur one-off, avec le code déployé et les variables
d'environnement **déjà injectées** (pas de `.env.local` là-bas — `dotenv` ne trouve
rien, c'est normal, les vars sont déjà dans `process.env`).

```bash
# Staging
scalingo -a fonds-argile-staging -region osc-fr1 run bash
# Prod
scalingo -a fonds-argile -region osc-secnum-fr1 run bash

# Puis, dans le conteneur :
pnpm ds:check-permissions
```

Lancer via l'alias `pnpm <script>` (ex. `pnpm ds:check-permissions`). `tsx` est une
dépendance de production, donc disponible dans le conteneur.

> **Gotcha pnpm/Scalingo** : par défaut, pnpm 11 vérifie les deps avant `pnpm <script>`
> et relance un `pnpm install` complet — qui **OOM (SIGKILL)** le conteneur one-off
> (RAM limitée). On désactive ce comportement via `verifyDepsBeforeRun: false` dans
> [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml), ce qui rend `pnpm <script>`
> identique en local et sur Scalingo. En secours, on peut toujours bypasser pnpm :
> `node_modules/.bin/tsx scripts/ops/<cat>/<script>.ts`.

Les scripts **autonomes** (sans import `@/`, comme `check-ds-permissions` et
`fetch-demarche-schema`) sont les plus robustes ; ceux qui importent `@/` nécessitent
`--tsconfig scripts/tsconfig.json`.

## Index

| Script                                                           | Type      | Rôle                                                                                                                            | Lancement                                              |
| ---------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`audit-parcours-ds-integrity.ts`](#audit-parcours-ds-integrity) | read-only | Détecte les parcours dont l'état interne n'a pas de dossier DS correspondant                                                    | `tsx scripts/ops/audit/audit-parcours-ds-integrity.ts` |
| [`audit-dossiers-bloques.ts`](#audit-dossiers-bloques)           | read-only | Parcours bloqués sur le dossier de l'étape courante (en_construction/en_instruction), cross-check DS optionnel                  | `pnpm audit:dossiers-bloques`                          |
| [`audit-epci-fallback.ts`](#audit-epci-fallback)                 | read-only | Liste les EPCI des dossiers absents du référentiel SEO (affichés en code brut dans le filtre AMO) et les catégorise via geo.api | `tsx scripts/ops/audit/audit-epci-fallback.ts`         |
| [`fix-double-progression-amo.ts`](#fix-double-progression-amo)   | **écrit** | Détecte et corrige les parcours victimes du bug double-progression AMO (régression vers eligibilite/todo)                       | `tsx scripts/ops/fix/fix-double-progression-amo.ts`    |
| [`verify-dashboard-stats.ts`](#verify-dashboard-stats)           | read-only | Vérifie que les stats du tableau de bord correspondent aux requêtes SQL équivalentes                                            | `tsx scripts/ops/audit/verify-dashboard-stats.ts`      |
| [`fix-missing-epci.ts`](#fix-missing-epci)                       | **écrit** | Backfill du code EPCI sur les parcours qui en sont dépourvus (via `geo.api.gouv.fr`)                                            | `pnpm fix:epci`                                        |
| [`reouvrir-demande.ts`](#reouvrir-demande)                       | **écrit** | Ré-ouvre une demande refusée par l'AMO (changement d'avis) : statut refusé -> en_attente + token frais (+ email)                | `pnpm fix:reouvrir-demande`                            |
| [`detacher-amo.ts`](#detacher-amo)                               | **écrit** | Détache l'AMO d'un parcours (passage en « sans AMO ») : AMO choisi avant l'arrêté, le demandeur veut continuer seul             | `pnpm fix:detacher-amo`                                |
| [`purge-comptes-test-fc.ts`](#purge-comptes-test-fc)             | **écrit** | Supprime (cascade) les comptes demandeurs de test FranceConnect du CSV mocké FC low — staging/local uniquement, refus en prod   | `pnpm fix:purge-comptes-test-fc`                       |
| [`debug-matomo-events.ts`](#debug-matomo-events)                 | read-only | Diagnostic des doublons d'événements Matomo (funnel simulateur)                                                                 | `tsx scripts/ops/debug/debug-matomo-events.ts`         |
| [`fetch-demarche-schema.ts`](#fetch-demarche-schema)             | read-only | Dump les champs + annotations d'une démarche DS avec leurs IDs (alimente `ds-field-ids.ts`)                                     | `pnpm ds:fetch-schema <numero>`                        |
| [`check-ds-permissions.ts`](#check-ds-permissions)               | read-only | Vérifie que le token GraphQL a accès à chaque démarche configurée (sinon synchro KO)                                            | `pnpm ds:check-permissions`                            |
| [`extend-expired-tokens.sql`](#extend-expired-tokens)            | **écrit** | Repousse la date d'expiration des tokens AMO expirés                                                                            | `psql -f scripts/ops/sql/extend-expired-tokens.sql`    |
| [`cleanup-staging.sql`](#cleanup-staging)                        | **écrit** | Nettoyage destructif d'une BDD staging (TRUNCATE des tables transactionnelles)                                                  | `psql -f scripts/ops/sql/cleanup-staging.sql`          |

## Détails

### audit-parcours-ds-integrity

Cible : parcours avec `current_step IN (diagnostic, devis, factures)` mais sans `dossiers_demarches_simplifiees` correspondant. Cherche par email côté DS pour proposer un rattachement manuel.

```bash
tsx scripts/ops/audit/audit-parcours-ds-integrity.ts
tsx scripts/ops/audit/audit-parcours-ds-integrity.ts --csv=rapport.csv
tsx scripts/ops/audit/audit-parcours-ds-integrity.ts --parcours-id=<uuid>
tsx scripts/ops/audit/audit-parcours-ds-integrity.ts --anonymize   # masque les PII
```

**Prérequis** : `.env.local` avec `DATABASE_URL` + `DEMARCHES_SIMPLIFIEES_*`.

### audit-dossiers-bloques

Parcours actifs bloqués sur le dossier de leur **étape courante**. Audite par défaut
les deux statuts : `en_construction` (brouillon jamais déposé = drop-off usager) et
`en_instruction` (déposé mais qui n'avance pas). Sortie : répartition par étape/statut
et par ancienneté. Avec `--check-ds`, croise chaque dossier avec son vrai statut DS pour
séparer **drop-off** (DS aussi en_construction, pas un bug) de **désync** (DS plus avancé
que nous = bug) et des cas **DS supprimé/inaccessible** (démarche test/permission, cf.
[ADR-0011](../../docs/adr/0011-instance-unique-ds-et-permissions-token.md)).

```bash
pnpm audit:dossiers-bloques                       # les 2 statuts (défaut)
pnpm audit:dossiers-bloques --check-ds            # + vrai statut DS (drop-off vs désync)
pnpm audit:dossiers-bloques --only=en_instruction # un seul statut
pnpm audit:dossiers-bloques --older-than=30       # bloqués depuis > 30 jours
pnpm audit:dossiers-bloques --check-ds --csv=rapport.csv --anonymize
```

**Prérequis** : `.env.local` avec `DATABASE_URL` (+ `DEMARCHES_SIMPLIFIEES_GRAPHQL_*` si `--check-ds`).

### audit-epci-fallback

Le filtre EPCI du listing AMO (espace-agent) affiche le **nom** de l'EPCI quand son SIREN figure dans le référentiel SEO (`src/features/seo/data/generated/epci.json`, ~163 EPCI), sinon retombe sur le **code brut**. Ce script liste les codes EPCI des dossiers absents du référentiel, compte les dossiers concernés, et catégorise chaque cas via `geo.api.gouv.fr` :

- **hors top-300** : EPCI d'un département couvert mais absent du référentiel — le générateur SEO ne récupère que les 300 communes les plus peuplées par département (`COMMUNES_PAR_DEPARTEMENT`), donc les EPCI de petites communes manquent.
- **hors zone** : EPCI d'un département non couvert par le dispositif.
- **code invalide** : SIREN inconnu de geo.api (périmé / fusion d'EPCI).

Sur une copie de prod, le résultat attendu est **0 fallback** (les vrais dossiers sont dans des EPCI référencés). Des fallbacks signalent en général des **données de staging non clean** (EPCI fictifs des seeds `fake-parcours`).

```bash
tsx scripts/ops/audit/audit-epci-fallback.ts
```

**Prérequis** : `.env.local` avec `DATABASE_URL`.

### fix-double-progression-amo

Détecte et corrige les parcours victimes du bug double-progression AMO (cf. [`../../docs/parcours/INCIDENT-double-progression-amo.md`](../../docs/parcours/INCIDENT-double-progression-amo.md)) : parcours en `diagnostic/devis/factures` sans dossier DS d'éligibilité. Le script détecte les cas lui-même (même critère que l'audit), les catégorise, et ramène les parcours concernés à `eligibilite/todo`. Pas de mapping JSON à produire.

Trois catégories, traitées différemment :

| Catégorie          | Critère                                                                                           | Traitement                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **régressable**    | aucun dossier DS                                                                                  | régression directe (`--apply`)                                     |
| **cleanup requis** | dossiers downstream uniquement `en_construction` (brouillons DS jamais soumis, ex. cas "Edouard") | suppression des brouillons + régression (`--apply --with-cleanup`) |
| **à reviewer**     | au moins un dossier downstream soumis (`en_instruction`/`accepte`/…)                              | jamais touché automatiquement — listé pour intervention humaine    |

Trois niveaux d'engagement croissants :

```bash
tsx scripts/ops/fix/fix-double-progression-amo.ts                         # dry-run : affiche le plan
tsx scripts/ops/fix/fix-double-progression-amo.ts --anonymize             # dry-run, PII masquées (partage)
tsx scripts/ops/fix/fix-double-progression-amo.ts --apply                 # corrige les régressables (cat. 1)
tsx scripts/ops/fix/fix-double-progression-amo.ts --apply --with-cleanup  # corrige aussi les cas "Edouard" (cat. 2)
tsx scripts/ops/fix/fix-double-progression-amo.ts --parcours-id=<uuid>    # cible un seul parcours
```

La régression est un UPDATE conditionnel sur `current_step IN (diagnostic,devis,factures)` (skip si l'état a changé entre la détection et l'apply). La suppression des brouillons est conditionnée sur `ds_status='en_construction'`. Tout passe en transaction par parcours.

**Vérification post-fix** : relancer en dry-run doit afficher 0 régressable / 0 cleanup requis. Relancer à J+3 et J+7 pour confirmer qu'aucun nouveau cas n'apparaît (le fix serveur d'idempotence tient).

**Prérequis** : `.env.local` avec `DATABASE_URL` (l'API DS n'est pas sollicitée).

### verify-dashboard-stats

Joue les mêmes requêtes Drizzle que le service `tableau-de-bord` et affiche les résultats avec les SQL équivalents (utile quand un chiffre du dashboard semble suspect).

```bash
tsx scripts/ops/audit/verify-dashboard-stats.ts
tsx scripts/ops/audit/verify-dashboard-stats.ts --periode 30j
tsx scripts/ops/audit/verify-dashboard-stats.ts --periode 30j --departement 24
```

### fix-missing-epci

Backfill du `logement.epci` sur ~10 parcours qui en sont dépourvus (problème historique). Utilise `geo.api.gouv.fr` pour résoudre commune → EPCI.

```bash
pnpm fix:epci                   # mode par défaut (dry-run d'abord, à confirmer)
```

### reouvrir-demande

Ré-ouvre une demande refusée par l'AMO quand le demandeur « se réveille » (changement
d'avis). Mince wrapper CLI autour du service `reouvrirDemandeRefusee` — le **même** que
le bouton UI « Ré-ouvrir la demande » de l'espace agent. Remet la validation refusée
(`logement_non_eligible` / `accompagnement_refuse`) en `en_attente`, désarchive le
parcours (`prospect`, `archived_at` -> NULL, `current_status` -> `en_instruction`) et
crée un token de validation frais (90 j). `--send-email` ré-envoie le mail à l'AMO
(nécessite un code INSEE demandeur ou agent). Dry-run par défaut.

> Le script n'écrit pas d'entrée d'audit `parcours_actions` (action ops, pas un agent
> connecté) ; le traçage QUI/QUAND ne concerne que la ré-ouverture via l'UI.

```bash
pnpm fix:reouvrir-demande --nom=Dupont                          # dry-run, trouve par nom (ILIKE)
pnpm fix:reouvrir-demande --parcours-id=<uuid>                  # dry-run
pnpm fix:reouvrir-demande --parcours-id=<uuid> --apply          # applique (sans email)
pnpm fix:reouvrir-demande --parcours-id=<uuid> --apply --send-email
```

### detacher-amo

Détache l'AMO d'un parcours et le bascule en « sans AMO » quand le demandeur veut
poursuivre seul. Cas d'usage : un AMO avait été choisi alors qu'il était obligatoire,
puis l'arrêté a rendu l'AMO facultatif ; aucun écran ne permet d'annuler
l'accompagnement une fois l'AMO choisi → opération manuelle. Reproduit l'état cible du
flux UI « renoncer à l'AMO » (`skipAmoStepForUser`) mais en partant d'un AMO **déjà
choisi ou validé**, ce que l'UI ne couvre pas.

Effet (en transaction) : `parcours_amo_validations` -> `statut = sans_amo`,
`attribution_mode = aucun`, `entreprise_amo_id = NULL`, purge commentaire / `validee_at`
/ tracking email ; les tokens AMO encore actifs sont invalidés (`used_at = now`, sinon
l'AMO pourrait valider via le vieux lien email). Progression d'étape : si le parcours
est encore à `choix_amo`, il avance à `eligibilite/todo` (comme le « skip » UI) ; s'il a
déjà dépassé `choix_amo`, l'étape est **inchangée** (on détache seulement l'AMO). Le
responsable bascule sur l'aller-vers du territoire (résolution par `rgaSimulationData`).
Dry-run par défaut.

> Le script n'écrit pas d'entrée d'audit `parcours_actions` (action ops, pas un agent
> connecté).

```bash
pnpm fix:detacher-amo --nom=Dupont                     # dry-run, trouve par nom (ILIKE)
pnpm fix:detacher-amo --parcours-id=<uuid>             # dry-run
pnpm fix:detacher-amo --parcours-id=<uuid> --apply     # applique
```

**Prérequis** : `.env.local` avec `DATABASE_URL` (l'API DS n'est pas sollicitée).

### purge-comptes-test-fc

Supprime les comptes demandeurs de **test FranceConnect** (et tout leur historique) issus
du CSV des citoyens mockés de l'IdP FC « low »
([`base.csv`](https://github.com/france-connect/sources/blob/main/docker/volumes/fcp-low/mocks/idp/databases/citizen/base.csv)).
Ces comptes n'existent qu'en integration/low (staging + local) : la connexion FC y passe
par un IdP mocké, la prod utilise le vrai FranceConnect. Le CSV est lu **en live** à
chaque exécution (pas de snapshot commité). La correspondance se fait sur l'**email** FC
(seul champ commun : le CSV n'expose pas de `sub`/`fcId`).

Effet : `db.delete(users)` sur les emails matchés, dans une transaction. La cascade DB
efface `parcours_prevention` puis `dossiers_demarches_simplifiees`,
`parcours_amo_validations` (→ `amo_validation_tokens`), `parcours_actions`,
`prospect_qualifications`, `sync_run_entries`. `agents`, `entreprises_amo` et `sync_runs`
ne sont pas touchés. Dry-run par défaut (liste + cascade prévisualisées, emails
anonymisés).

> **Garde-fou** : refus catégorique si `NEXT_PUBLIC_APP_ENV === "production"` (aucun
> override). À ne lancer qu'en staging ou local.

```bash
pnpm fix:purge-comptes-test-fc                          # dry-run
pnpm fix:purge-comptes-test-fc --apply                  # supprime
pnpm fix:purge-comptes-test-fc --email=test@yopmail.com --apply   # un seul compte
pnpm fix:purge-comptes-test-fc --no-anonymize           # emails/noms en clair
```

**Prérequis** : `.env.local` avec `DATABASE_URL` + `NEXT_PUBLIC_APP_ENV` ; accès réseau à
raw.githubusercontent.com pour le CSV.

### debug-matomo-events

Diagnostic des doublons d'événements Matomo dans le funnel simulateur :

1. Ratio events/visits par étape
2. Ratio `type_logement` / `start` (signature de double-fire)
3. Ratio par jour sur 10 jours
4. Segmentation par device
5. Comparaison 7j vs 30j vs 90j

```bash
tsx scripts/ops/debug/debug-matomo-events.ts
tsx scripts/ops/debug/debug-matomo-events.ts --since=2026-04-09
```

### fetch-demarche-schema

Dump le schéma complet d'une démarche DS : **champs publics ET annotations privées**, avec
pour chacun `id` (base64 `Champ-<stable_id>`), `label`, type et options. Se termine par un
bloc `=== RESUME IDS (copier-coller) ===` directement exploitable pour alimenter
[`ds-field-ids.ts`](../../src/features/parcours/dossiers-ds/domain/value-objects/ds-field-ids.ts).

```bash
pnpm ds:fetch-schema 126061                                 # numéro de démarche requis
```

Les IDs de champs sont **stables au clonage** d'une démarche : vérifié en juillet 2026,
l'éligibilité staging (146377) et prod (126061) exposent exactement les mêmes IDs, ce qui
justifie de les coder en dur. Attention en revanche aux **annotations privées ajoutées à la
main**, qui elles divergent (« Lien vers le dossier FPA » : `…NjY4NzQ3NQ==` en staging vs
`…NjY4NzQ1Mg==` en prod) — les revérifier par environnement avant de s'y fier.

### check-ds-permissions

Vérifie que le compte derrière `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY` est bien
instructeur/admin de **chaque** démarche configurée (`eligibilite`, `diagnostic`,
`devis`, `factures`). Une démarche en `UNAUTHORIZED` bloque silencieusement la
synchro des dossiers de cette étape (cf. [ADR-0011](../../docs/adr/0011-instance-unique-ds-et-permissions-token.md)).
Sort en `exit 1` si au moins une démarche de l'instance configurée est inaccessible.

```bash
pnpm ds:check-permissions                                   # instance configurée (env)
tsx scripts/ops/ds/check-ds-permissions.ts --instance=both     # teste les 2 domaines DS
```

**Prérequis** : `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY` + `DEMARCHES_SIMPLIFIEES_ID_*`
(en local via `.env.local` ; sur Scalingo les variables sont déjà injectées, voir
[Exécution sur Scalingo](#exécution-sur-scalingo)).

### extend-expired-tokens

Repousse la date d'expiration des tokens AMO expirés (`amo_validation_tokens.expires_at < now()`). À utiliser uniquement si nécessaire pour débloquer un AMO ou un test, jamais en prod sans raison documentée.

### cleanup-staging

**DESTRUCTIF**. TRUNCATE de toutes les tables transactionnelles (users, parcours, validations, commentaires, etc.). Préserve les tables de référence (rga_zones, catastrophes_naturelles, entreprises_amo, allers_vers).

À utiliser comme prérequis avant un `seed:staging` si la BDD n'est pas vide et qu'on veut repartir from-scratch sans tout reset.
