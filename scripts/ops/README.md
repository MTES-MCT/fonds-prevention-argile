# Ops — audit, fix, debug, cleanup

Utilitaires pour intervenir sur une BDD existante : audit d'intégrité, correction ponctuelle, debug d'un comportement. Pas de seed ici (cf. [`../seed/`](../seed/README.md)).

> Tous les scripts read-only par défaut. Ceux qui écrivent ont un mode `--dry-run` pour prévisualiser avant d'appliquer.

## Index

| Script | Type | Rôle | Lancement |
|---|---|---|---|
| [`audit-parcours-ds-integrity.ts`](#audit-parcours-ds-integrity) | read-only | Détecte les parcours dont l'état interne n'a pas de dossier DS correspondant | `tsx scripts/ops/audit-parcours-ds-integrity.ts` |
| [`fix-double-progression-amo.ts`](#fix-double-progression-amo) | **écrit** | Détecte et corrige les parcours victimes du bug double-progression AMO (régression vers eligibilite/todo) | `tsx scripts/ops/fix-double-progression-amo.ts` |
| [`verify-dashboard-stats.ts`](#verify-dashboard-stats) | read-only | Vérifie que les stats du tableau de bord correspondent aux requêtes SQL équivalentes | `tsx scripts/ops/verify-dashboard-stats.ts` |
| [`fix-missing-epci.ts`](#fix-missing-epci) | **écrit** | Backfill du code EPCI sur les parcours qui en sont dépourvus (via `geo.api.gouv.fr`) | `pnpm fix:epci` |
| [`debug-matomo-events.ts`](#debug-matomo-events) | read-only | Diagnostic des doublons d'événements Matomo (funnel simulateur) | `tsx scripts/ops/debug-matomo-events.ts` |
| [`fetch-demarche-schema.ts`](#fetch-demarche-schema) | read-only | Récupère le schéma GraphQL d'une démarche DS (utile pour itérer sur les mappings) | `tsx scripts/ops/fetch-demarche-schema.ts` |
| [`extend-expired-tokens.sql`](#extend-expired-tokens) | **écrit** | Repousse la date d'expiration des tokens AMO expirés | `psql -f scripts/ops/extend-expired-tokens.sql` |
| [`cleanup-staging.sql`](#cleanup-staging) | **écrit** | Nettoyage destructif d'une BDD staging (TRUNCATE des tables transactionnelles) | `psql -f scripts/ops/cleanup-staging.sql` |

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

### fix-double-progression-amo

Détecte et corrige les parcours victimes du bug double-progression AMO (cf. [`../../docs/parcours/INCIDENT-double-progression-amo.md`](../../docs/parcours/INCIDENT-double-progression-amo.md)) : parcours en `diagnostic/devis/factures` sans dossier DS d'éligibilité. Le script détecte les cas lui-même (même critère que l'audit), les catégorise, et ramène les parcours concernés à `eligibilite/todo`. Pas de mapping JSON à produire.

Trois catégories, traitées différemment :

| Catégorie | Critère | Traitement |
|---|---|---|
| **régressable** | aucun dossier DS | régression directe (`--apply`) |
| **cleanup requis** | dossiers downstream uniquement `en_construction` (brouillons DS jamais soumis, ex. cas "Edouard") | suppression des brouillons + régression (`--apply --with-cleanup`) |
| **à reviewer** | au moins un dossier downstream soumis (`en_instruction`/`accepte`/…) | jamais touché automatiquement — listé pour intervention humaine |

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

### extend-expired-tokens

Repousse la date d'expiration des tokens AMO expirés (`amo_validation_tokens.expires_at < now()`). À utiliser uniquement si nécessaire pour débloquer un AMO ou un test, jamais en prod sans raison documentée.

### cleanup-staging

**DESTRUCTIF**. TRUNCATE de toutes les tables transactionnelles (users, parcours, validations, commentaires, etc.). Préserve les tables de référence (rga_zones, catastrophes_naturelles, entreprises_amo, allers_vers).

À utiliser comme prérequis avant un `seed:staging` si la BDD n'est pas vide et qu'on veut repartir from-scratch sans tout reset.
