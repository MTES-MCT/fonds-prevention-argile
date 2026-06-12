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

Lancer les scripts via leur alias `pnpm <script>` (ex. `pnpm ds:check-permissions`),
pas `tsx ...` nu ni `npx tsx` (résolution du binaire et version pnpm). `tsx` est une
dépendance de production, donc disponible dans le conteneur. Les scripts **autonomes**
(sans import `@/`, comme `check-ds-permissions` et `fetch-demarche-schema`) sont les plus
robustes ; ceux qui importent `@/` nécessitent `--tsconfig scripts/tsconfig.json`.

## Index

| Script                                                           | Type      | Rôle                                                                                                                            | Lancement                                        |
| ---------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [`audit-parcours-ds-integrity.ts`](#audit-parcours-ds-integrity) | read-only | Détecte les parcours dont l'état interne n'a pas de dossier DS correspondant                                                    | `tsx scripts/ops/audit-parcours-ds-integrity.ts` |
| [`audit-epci-fallback.ts`](#audit-epci-fallback)                 | read-only | Liste les EPCI des dossiers absents du référentiel SEO (affichés en code brut dans le filtre AMO) et les catégorise via geo.api | `tsx scripts/ops/audit-epci-fallback.ts`         |
| [`fix-double-progression-amo.ts`](#fix-double-progression-amo)   | **écrit** | Détecte et corrige les parcours victimes du bug double-progression AMO (régression vers eligibilite/todo)                       | `tsx scripts/ops/fix-double-progression-amo.ts`  |
| [`verify-dashboard-stats.ts`](#verify-dashboard-stats)           | read-only | Vérifie que les stats du tableau de bord correspondent aux requêtes SQL équivalentes                                            | `tsx scripts/ops/verify-dashboard-stats.ts`      |
| [`fix-missing-epci.ts`](#fix-missing-epci)                       | **écrit** | Backfill du code EPCI sur les parcours qui en sont dépourvus (via `geo.api.gouv.fr`)                                            | `pnpm fix:epci`                                  |
| [`debug-matomo-events.ts`](#debug-matomo-events)                 | read-only | Diagnostic des doublons d'événements Matomo (funnel simulateur)                                                                 | `tsx scripts/ops/debug-matomo-events.ts`         |
| [`fetch-demarche-schema.ts`](#fetch-demarche-schema)             | read-only | Récupère le schéma GraphQL d'une démarche DS (utile pour itérer sur les mappings)                                               | `tsx scripts/ops/fetch-demarche-schema.ts`       |
| [`check-ds-permissions.ts`](#check-ds-permissions)               | read-only | Vérifie que le token GraphQL a accès à chaque démarche configurée (sinon synchro KO)                                            | `pnpm ds:check-permissions`                      |
| [`extend-expired-tokens.sql`](#extend-expired-tokens)            | **écrit** | Repousse la date d'expiration des tokens AMO expirés                                                                            | `psql -f scripts/ops/extend-expired-tokens.sql`  |
| [`cleanup-staging.sql`](#cleanup-staging)                        | **écrit** | Nettoyage destructif d'une BDD staging (TRUNCATE des tables transactionnelles)                                                  | `psql -f scripts/ops/cleanup-staging.sql`        |

## Détails

### audit-parcours-ds-integrity

Cible : parcours avec `current_step IN (diagnostic, devis, factures)` mais sans `dossiers_demarches_simplifiees` correspondant. Cherche par email côté DS pour proposer un rattachement manuel.

```bash
tsx scripts/ops/audit-parcours-ds-integrity.ts
tsx scripts/ops/audit-parcours-ds-integrity.ts --csv=rapport.csv
tsx scripts/ops/audit-parcours-ds-integrity.ts --parcours-id=<uuid>
tsx scripts/ops/audit-parcours-ds-integrity.ts --anonymize   # masque les PII
```

**Prérequis** : `.env.local` avec `DATABASE_URL` + `DEMARCHES_SIMPLIFIEES_*`.

### audit-epci-fallback

Le filtre EPCI du listing AMO (espace-agent) affiche le **nom** de l'EPCI quand son SIREN figure dans le référentiel SEO (`src/features/seo/data/generated/epci.json`, ~163 EPCI), sinon retombe sur le **code brut**. Ce script liste les codes EPCI des dossiers absents du référentiel, compte les dossiers concernés, et catégorise chaque cas via `geo.api.gouv.fr` :

- **hors top-300** : EPCI d'un département couvert mais absent du référentiel — le générateur SEO ne récupère que les 300 communes les plus peuplées par département (`COMMUNES_PAR_DEPARTEMENT`), donc les EPCI de petites communes manquent.
- **hors zone** : EPCI d'un département non couvert par le dispositif.
- **code invalide** : SIREN inconnu de geo.api (périmé / fusion d'EPCI).

Sur une copie de prod, le résultat attendu est **0 fallback** (les vrais dossiers sont dans des EPCI référencés). Des fallbacks signalent en général des **données de staging non clean** (EPCI fictifs des seeds `fake-parcours`).

```bash
tsx scripts/ops/audit-epci-fallback.ts
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
tsx scripts/ops/fix-double-progression-amo.ts                         # dry-run : affiche le plan
tsx scripts/ops/fix-double-progression-amo.ts --anonymize             # dry-run, PII masquées (partage)
tsx scripts/ops/fix-double-progression-amo.ts --apply                 # corrige les régressables (cat. 1)
tsx scripts/ops/fix-double-progression-amo.ts --apply --with-cleanup  # corrige aussi les cas "Edouard" (cat. 2)
tsx scripts/ops/fix-double-progression-amo.ts --parcours-id=<uuid>    # cible un seul parcours
```

La régression est un UPDATE conditionnel sur `current_step IN (diagnostic,devis,factures)` (skip si l'état a changé entre la détection et l'apply). La suppression des brouillons est conditionnée sur `ds_status='en_construction'`. Tout passe en transaction par parcours.

**Vérification post-fix** : relancer en dry-run doit afficher 0 régressable / 0 cleanup requis. Relancer à J+3 et J+7 pour confirmer qu'aucun nouveau cas n'apparaît (le fix serveur d'idempotence tient).

**Prérequis** : `.env.local` avec `DATABASE_URL` (l'API DS n'est pas sollicitée).

### verify-dashboard-stats

Joue les mêmes requêtes Drizzle que le service `tableau-de-bord` et affiche les résultats avec les SQL équivalents (utile quand un chiffre du dashboard semble suspect).

```bash
tsx scripts/ops/verify-dashboard-stats.ts
tsx scripts/ops/verify-dashboard-stats.ts --periode 30j
tsx scripts/ops/verify-dashboard-stats.ts --periode 30j --departement 24
```

### fix-missing-epci

Backfill du `logement.epci` sur ~10 parcours qui en sont dépourvus (problème historique). Utilise `geo.api.gouv.fr` pour résoudre commune → EPCI.

```bash
pnpm fix:epci                   # mode par défaut (dry-run d'abord, à confirmer)
```

### debug-matomo-events

Diagnostic des doublons d'événements Matomo dans le funnel simulateur :

1. Ratio events/visits par étape
2. Ratio `type_logement` / `start` (signature de double-fire)
3. Ratio par jour sur 10 jours
4. Segmentation par device
5. Comparaison 7j vs 30j vs 90j

```bash
tsx scripts/ops/debug-matomo-events.ts
tsx scripts/ops/debug-matomo-events.ts --since=2026-04-09
```

### fetch-demarche-schema

Récupère le schéma GraphQL d'une démarche DS (champs publics) pour vérifier les mappings côté code.

### check-ds-permissions

Vérifie que le compte derrière `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY` est bien
instructeur/admin de **chaque** démarche configurée (`eligibilite`, `diagnostic`,
`devis`, `factures`). Une démarche en `UNAUTHORIZED` bloque silencieusement la
synchro des dossiers de cette étape (cf. [ADR-0009](../../docs/adr/0009-instance-unique-ds-et-permissions-token.md)).
Sort en `exit 1` si au moins une démarche de l'instance configurée est inaccessible.

```bash
pnpm ds:check-permissions                                   # instance configurée (env)
tsx scripts/ops/check-ds-permissions.ts --instance=both     # teste les 2 domaines DS
```

**Prérequis** : `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY` + `DEMARCHES_SIMPLIFIEES_ID_*`
(en local via `.env.local` ; sur Scalingo les variables sont déjà injectées, voir
[Exécution sur Scalingo](#exécution-sur-scalingo)).

### extend-expired-tokens

Repousse la date d'expiration des tokens AMO expirés (`amo_validation_tokens.expires_at < now()`). À utiliser uniquement si nécessaire pour débloquer un AMO ou un test, jamais en prod sans raison documentée.

### cleanup-staging

**DESTRUCTIF**. TRUNCATE de toutes les tables transactionnelles (users, parcours, validations, commentaires, etc.). Préserve les tables de référence (rga_zones, catastrophes_naturelles, entreprises_amo, allers_vers).

À utiliser comme prérequis avant un `seed:staging` si la BDD n'est pas vide et qu'on veut repartir from-scratch sans tout reset.
