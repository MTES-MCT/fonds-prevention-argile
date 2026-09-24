# Seed — peuplement BDD de test

Outils pour bootstrap une base **de zéro** avec des données de test cohérentes (agents super-admins, AMO, Allers-vers, users démandeurs, parcours à différents stades, dossiers DS, commentaires, etc.).

> ⚠️ **Strictement réservé aux environnements local / docker / staging**. Un garde-fou triple refuse l'exécution en production (cf. ci-dessous).

## TL;DR

```bash
# Pré-requis : BDD propre, migrations à jour, RGA + catnat déjà importés
pnpm seed:staging
```

Pipeline en 6 étapes, ~30s en local. Résultat : agents de test + AMO/AV de test + 70 users + parcours à tous les stades.

## Pipeline

Le script `seed-staging.ts` enchaîne 6 étapes. Chacune est lançable séparément via `--steps`.

| #   | Step       | Quoi                                                                                        | Idempotent                                |
| --- | ---------- | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | `safety`   | Vérifie `NEXT_PUBLIC_APP_ENV` + heuristique `DATABASE_URL`                                  | —                                         |
| 2   | `ref-data` | Vérifie que `rga_zones` et `catastrophes_naturelles` sont non-vides (sinon bail)            | —                                         |
| 3   | `agents`   | Fixtures d'agents (`sql/agents/…`) + `SEED_AGENTS_SUPERADMINS` + `SEED_AGENTS_HYBRIDES`     | ✅ `ON CONFLICT (email) DO UPDATE`        |
| 4   | `amo-av`   | AMO + Allers-vers de test (`sql/amo-av/seed-amo-av-fixtures.sql`)                           | ✅ `ON CONFLICT`                          |
| 5   | `parcours` | Joue les 13 fichiers SQL dans `sql/fake-parcours/00-init.sql` → `13-amo-av-arrete-2026.sql` | ✅ via `00-init.sql` qui TRUNCATE en tête |
| 6   | `verify`   | Joue `sql/fake-parcours/99-verification.sql` (counts attendus)                              | —                                         |

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

# + supprime les comptes de test FranceConnect avant de seeder
pnpm seed:staging --yes-staging --purge-fc
```

### `--purge-fc` — repartir d'un staging propre

Le seed ne voit pas les comptes créés par un vrai login FranceConnect de test : ses nettoyages
ciblent ses propres préfixes d'uuid, un compte FC a un uuid aléatoire. Il ne les laisse pas
intacts pour autant — l'étape `amo-av` fait un `DELETE FROM parcours_amo_validations` **sans
filtre**, donc ces comptes gardent leur simulation mais perdent leur validation AMO. Ni neufs,
ni cohérents.

`--purge-fc` supprime ces comptes (cascade complète) **avant** que le seed ne rejoue ses
fixtures, ce qui rend l'état de départ d'une session de test entièrement reproductible. La liste
des emails vient du [CSV de l'IdP FC « low »](https://github.com/france-connect/sources/blob/main/docker/volumes/fcp-low/mocks/idp/databases/citizen/base.csv),
lu en direct : une session sans accès réseau sortant échoue plutôt que de ne rien supprimer en
silence. Le flag suit `--dry-run`, et reste soumis au garde-fou triple ci-dessous — même si
`--steps=` a exclu l'étape `safety`.

Même logique, en autonome et avec un rapport détaillé : `pnpm fix:purge-comptes-test-fc`
(dry-run par défaut, `--email=` pour cibler). Les deux partagent `scripts/ops/lib/purge-fc.ts`.

## Super-administrateurs : jamais dans le dépôt

Les fichiers SQL de ce dossier sont commités, donc publics : ils ne contiennent **aucune
identité réelle**. Y inscrire les adresses de l'équipe reviendrait à publier une liste
nominative de comptes à privilèges — du ciblage prêt à l'emploi pour du phishing, en plus
d'une divulgation de données personnelles.

Les adresses réelles arrivent par l'environnement, au moment du seed :

```bash
SEED_AGENTS_SUPERADMINS="prenom.nom@beta.gouv.fr,autre.personne@beta.gouv.fr" \
  pnpm seed:staging --yes-staging --steps=agents
```

Variable absente = aucun super-admin nominatif inséré, et le seed le dit dans sa sortie.
Les lignes sont écrites en requête paramétrée, une par adresse, en `ON CONFLICT (email)
DO UPDATE SET role` : re-jouer le seed ne duplique rien et n'écrase ni le `sub` ni l'état
civil déjà renseignés par ProConnect.

Sur un environnement **neuf**, où personne ne peut encore se connecter pour créer des
agents via `/administration/agents`, l'amorçage du premier compte passe par
`sql/agents/seed-agents-prod.sql`, qui prend lui aussi l'adresse en paramètre :

```bash
psql "$DATABASE_URL" \
  -v email="'prenom.nom@example.gouv.fr'" -v given="'Prénom'" -v usual="'Nom'" \
  -f scripts/seed/sql/agents/seed-agents-prod.sql
```

## Structures partenaires : des contacts qui partent vraiment

Même principe pour les AMO et Allers-vers, avec une raison supplémentaire : leurs adresses
ne dorment pas en base, **l'application écrit dessus**. L'auto-attribution envoie l'invitation
à l'AMO du territoire (cf. [FLOW-AND-SYNC §2.3.1](../../docs/parcours/FLOW-AND-SYNC.md)) — un
parcours de test dans l'Indre suffisait donc à envoyer un vrai email à une vraie structure
partenaire depuis staging.

Les fixtures portent désormais des adresses `@example.org`, que la RFC 2606 garantit non
attribuables : aucun message ne peut atteindre un tiers, quel que soit l'environnement. Même
traitement pour les téléphones (`0X XX 00 00 00`) et les SIRET (série `999999999000XX`). Les
**noms et périmètres territoriaux sont conservés** : ils sont publics — l'app les affiche aux
demandeurs — et les checklists de test s'y réfèrent.

En contrepartie, plus personne ne reçoit l'invitation AMO. En local, Mailhog les capture
toutes quelle que soit l'adresse. Sur staging, passer **une** adresse de base :

```bash
SEED_STRUCTURES_EMAIL="prenom.nom@beta.gouv.fr" \
  pnpm seed:staging --yes-staging
```

Le seed en dérive **un alias par structure**, en sous-adressant avec le slug de la fixture :
`alohe@example.org` devient `prenom.nom+alohe@beta.gouv.fr`, `terre-solide@example.org`
devient `prenom.nom+terre-solide@beta.gouv.fr`. Tout arrive dans la même boîte, mais chaque
message reste attribuable à sa structure et filtrable — ce qu'une adresse unique partagée
par les 24 structures ne permettrait pas. Les quatre Soliha Hauts-de-France, qui partagent
volontairement une adresse dans les fixtures, partagent donc aussi leur alias.

La conversion a lieu **après l'étape `parcours`**, et non pendant `amo-av` : deux fichiers de
`fake-parcours` (07 et 13) suppriment puis réinsèrent les structures « seed test », qui
échapperaient sinon aux alias. Elle ne convertit que les adresses `@example.org` : la rejouer ne
double pas l'alias, et une structure créée à la main pendant un test garde son adresse.

Variable absente = les `@example.org` restent en place, et le seed le dit dans sa sortie.

### Testeurs du rôle AMO + Aller-vers

Même mécanisme pour les personnes qui testent le rôle cumulé avec leur propre identité :

```bash
SEED_AGENTS_HYBRIDES="prenom.nom@exemple.fr,autre.personne@exemple.fr" \
  pnpm seed:staging --yes-staging --steps=agents
```

Chaque adresse devient un agent `amo_et_allers_vers` rattaché à l'AMO Maison Tranquille et à
l'Aller-vers Adil 36 (département 36), les deux structures qu'exige ce rôle. La variable n'est
pas un confort : l'étape `amo-av` vide `allers_vers`, ce qui remet à `NULL` le lien de ces
agents, et sans elle ils tombent en « compte inexploitable » à chaque re-seed. Le rôle, les
deux rattachements et la désactivation sont réécrits ; le nom et le `sub`, écrits par
ProConnect, ne le sont pas.

### Quels comptes sont réellement connectables

Seules les identités du **bac à sable ProConnect** le sont (`user@yopmail.com`,
`user14@yopmail.com` — cf. « Se connecter en tant qu'agent en local » dans le
[README](../../README.md)). C'est pourquoi le seed les rattache explicitement à une
structure : sans rattachement, l'espace agent bascule sur le listing national au lieu du
périmètre attendu. Les fixtures `@example.org` ne servent qu'à couvrir les rôles dans le
jeu de données, elles ne permettent pas de se connecter.

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
│   ├── seed-agents-local-staging.sql   # fixtures + comptes bac à sable ProConnect
│   └── seed-agents-prod.sql            # amorçage du 1er super-admin, paramétré
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
