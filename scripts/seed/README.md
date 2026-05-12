# Seed — peuplement BDD de test

Outils pour bootstrap une base **de zéro** avec des données de test cohérentes (agents super-admins, AMO, Allers-vers, users démandeurs, parcours à différents stades, dossiers DS, commentaires, etc.).

> ⚠️ **Strictement réservé aux environnements local / docker / staging**. Un garde-fou triple refuse l'exécution en production (cf. ci-dessous).

## TL;DR

```bash
# Pré-requis : BDD propre, migrations à jour, RGA + catnat déjà importés
pnpm seed:staging
```

Pipeline en 6 étapes, ~30s en local. Résultat : 7 super-admins + AMO/AV de test + 70 users + parcours à tous les stades.

## Pipeline

Le script `seed-staging.ts` enchaîne 6 étapes. Chacune est lançable séparément via `--steps`.

| # | Step | Quoi | Idempotent |
|---|---|---|---|
| 1 | `safety` | Vérifie `NEXT_PUBLIC_APP_ENV` + heuristique `DATABASE_URL` | — |
| 2 | `ref-data` | Vérifie que `rga_zones` et `catastrophes_naturelles` sont non-vides (sinon bail) | — |
| 3 | `agents` | Insère 7 super-admins (`sql/agents/seed-agents-local-staging.sql`) | ✅ `ON CONFLICT (email) DO UPDATE` |
| 4 | `amo-av` | Insère AMO + Allers-vers de test (`sql/amo-av/seed-amo-av-fixtures.sql`) | ✅ `ON CONFLICT` |
| 5 | `parcours` | Joue les 13 fichiers SQL dans `sql/fake-parcours/00-init.sql` → `13-amo-av-arrete-2026.sql` | ✅ via `00-init.sql` qui TRUNCATE en tête |
| 6 | `verify` | Joue `sql/fake-parcours/99-verification.sql` (counts attendus) | — |

## Pré-requis (étape `ref-data`)

Les **données de référence** (RGA + catnat) ne sont **pas** créées par ce seed, parce qu'elles sont volumineuses, nécessitent des dépendances système (PostGIS, ogr2ogr) et ne changent quasi jamais. Le script vérifie juste qu'elles sont présentes et bail sinon.

À lancer manuellement **une seule fois** par environnement, avant le premier `seed:staging` :

```bash
# 1. Zones RGA (12 départements pilotes, ~121k polygones, ~2 min)
pnpm rga:import /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp
# → cf. scripts/import/rga-zones/README.md pour récupérer le shapefile

# 2. Catastrophes naturelles (API Georisques)
pnpm seo:import-catnat
```

## CLI

```bash
# Tout (par défaut)
pnpm seed:staging

# Subset (utile pour itérer)
pnpm seed:staging --steps=agents,amo-av
pnpm seed:staging --steps=parcours

# Mode dry-run (log les étapes sans exécuter le SQL)
pnpm seed:staging --dry-run

# Confirmation explicite (requise quand NEXT_PUBLIC_APP_ENV=staging)
pnpm seed:staging --yes-staging
```

## Garde-fou triple (refus en prod)

Le script bail avec exit 1 dans ces 3 cas :

1. **`NEXT_PUBLIC_APP_ENV=production`** → message `REFUSED: NEXT_PUBLIC_APP_ENV=production`
2. **`DATABASE_URL` qui matche `/prod(uction)?/i`** (sans `staging` à côté) → heuristique, peut générer un faux-positif sur un host bizarrement nommé
3. **`NEXT_PUBLIC_APP_ENV=staging` sans `--yes-staging`** → exige une confirmation explicite pour éviter le slip-of-fingers

En `local` ou `docker`, aucune confirmation n'est demandée.

## Structure des SQL

```
sql/
├── agents/                          # Super-administrateurs
│   ├── seed-agents-local-staging.sql   # 7 super-admins (beta.gouv + yopmail)
│   └── seed-agents-prod.sql            # à utiliser hors pipeline auto (rare)
├── amo-av/                          # Fixtures AMO + Allers-vers
│   └── seed-amo-av-fixtures.sql        # 2-3 AMO + 2-3 AV de test
└── fake-parcours/                   # 13 étapes pour peupler les parcours
    ├── 00-init.sql                  # TRUNCATE des tables touchées
    ├── 01-users.sql                 # 40 users (parcours AMO)
    ├── 01b-users-prospects.sql      # 30 users (parcours Allers-vers)
    ├── 02-parcours.sql              # 70 parcours_prevention
    ├── 03-validations-amo.sql       # 30 validations AMO (4 statuts)
    ├── 04-dossiers-ds.sql           # 8 dossiers Démarches Simplifiées
    ├── 05-prospects-sans-amo.sql    # 30 prospects (sans AMO, AV)
    ├── 06-test-aucun-amo.sql        # Edge case "aucun AMO disponible"
    ├── 07-commentaires.sql          # 20 commentaires + 2 agents fictifs
    ├── 08-prospect-qualifications.sql
    ├── 09-archives-dashboard.sql
    ├── 10-top-departements-dashboard.sql
    ├── 11-statistiques-demandes.sql
    ├── 12-donnees-eligibilite.sql
    ├── 13-amo-av-arrete-2026.sql    # 4 modes AMO (OBLIGATOIRE, AV_AMO_FUSIONNES, FACULTATIF, FACULTATIF_SANS_AMO)
    └── 99-verification.sql          # Counts attendus
```

## Ajouter une nouvelle fixture

1. Choisir le bon sous-dossier (`agents/`, `amo-av/`, `fake-parcours/`).
2. Si dans `fake-parcours/`, numéroter pour respecter l'ordre (les FK dépendent de l'ordre).
3. Préfixer toute insertion d'un `ON CONFLICT ... DO UPDATE/NOTHING` ou compter sur le `TRUNCATE` de `00-init.sql`.
4. Ajouter une ligne dans le `99-verification.sql` (count attendu).
5. Si nouvelle étape distincte (pas dans `fake-parcours/`), l'ajouter dans `STEPS` du `seed-staging.ts`.

## Vérification post-seed

```bash
pnpm db:studio
```

Ou via psql :

```sql
SELECT count(*) FROM agents;                       -- 7
SELECT count(*) FROM entreprises_amo;              -- ≥ 1
SELECT count(*) FROM allers_vers;                  -- ≥ 1
SELECT count(*) FROM users;                        -- ~70
SELECT count(*) FROM parcours_prevention;          -- ~70
SELECT count(*) FROM parcours_amo_validations;     -- 30
SELECT count(*) FROM dossiers_demarches_simplifiees; -- 8
```

Les counts exacts sont dans `sql/fake-parcours/99-verification.sql`.
