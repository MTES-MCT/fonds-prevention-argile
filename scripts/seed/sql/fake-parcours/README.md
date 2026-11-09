# Seed Fake Parcours

Données de test pour l'espace agent (dossiers, demandes, prospects) et les statistiques du back-office.

## Exécution

Ces fichiers sont joués par l'étape `parcours` de `pnpm seed:staging`, dans l'ordre de
`FAKE_PARCOURS_FILES` (`scripts/seed/seed-staging.ts`) : voir [le README du seed](../../README.md).
Ils supposent l'étape `amo-av` déjà jouée (`03`, `09` et `11` référencent ses AMO).

```bash
pnpm seed:staging --steps=parcours            # rejoue les parcours seuls
pnpm seed:staging --steps=amo-av,parcours,agents
```

`06-test-aucun-amo.sql` n'est pas joué : c'est un scénario manuel (alerte « Aucun AMO
disponible »), qui retire leur territoire à toutes les AMO du 36. Le dérouler à la main (cf.
son en-tête), puis rejouer le seed pour revenir en arrière.

## Données créées

| Fichier                     | Contenu                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `01-users.sql`              | 43 users (parcours avec AMO)                                            |
| `01b-users-prospects.sql`   | 38 users (prospects)                                                    |
| `02-parcours.sql`           | 43 parcours                                                             |
| `03-validations-amo.sql`    | 43 validations AMO                                                      |
| `04-dossiers-ds.sql`        | 43 dossiers DS                                                          |
| `05-prospects-sans-amo.sql` | 38 prospects sans AMO                                                   |
| `07-commentaires.sql`       | 2 agents fictifs et 20 commentaires                                     |
| `08` à `15`                 | qualifications, archives, statistiques, éligibilité, demandeurs proches |

Au total : ~230 users et parcours, ~60 validations AMO, ~90 dossiers DS.

### Répartition des validations AMO (`03`)

- `en_attente` : 11 demandes
- `logement_eligible` : 22 dossiers suivis
- `logement_non_eligible` : 6 refus
- `accompagnement_refuse` : 4 refus

### Répartition des prospects (`05`)

- **Récents** (< 7 jours), **moyens** (7-30 jours), **anciens** (> 30 jours) : 10 chacun, à l'étape `choix_amo`
- **Éligibles** : 5 (`situation_particulier = eligible`)
- **Archivés** : 3

## Nettoyage

`00-init.sql` supprime les données de test avant de les recréer.

## Identifiants

Les UUID utilisent des patterns reconnaissables :

- Users (AMO) : `11111111-1111-4111-8111-111111111101` à `140`, et `171` à `173`
- Users (Prospects) : `11111111-1111-4111-8111-111111111141` à `170`, et `181` à `188`
- Parcours (AMO) : `22222222-2222-4222-8222-2222222222XX`
- Parcours (Prospects) : `55555555-5555-4555-8555-5555555555XX`
- Validations : `33333333-3333-4333-8333-3333333333XX`
- Dossiers DS : `44444444-4444-4444-8444-4444444444XX`
- Commentaires : `77777777-7777-4777-8777-7777777777XX`
- Agents fictifs : `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa00N`

> Les nibbles `4` (version) et `8` (variante) ne sont pas décoratifs : sans eux, Zod 4
> rejette l'id (RFC 4122) et toute server action qui le valide échoue avant traitement —
> la qualification de prospect notamment. Les patterns `LIKE` de nettoyage et de comptage
> portent sur ce même préfixe et doivent rester alignés, sinon le seed perd son
> idempotence. Garde-fou : `scripts/seed/sql/seed-uuid-rfc.test.ts`.

## Cas d'usage

### Tester l'espace Allers-Vers

Se connecter avec un agent Aller-vers couvrant l'Indre (36), par exemple `user@yopmail.com`
(Adil 36), puis ouvrir `/espace-agent/dossiers` : les prospects sans AMO y figurent
(`/espace-agent/prospects` redirige vers cette page).

### Tester les commentaires (notes partagées)

Le script `07-commentaires.sql` crée 2 agents fictifs non-connectables et 20 commentaires décalés :

- **Géraldine Moulin** (AMO du Berry Profond)
- **Jean-Patrick Duval** (Allers-Vers Centre Indre)

Utile pour vérifier que le menu modifier/supprimer n'apparaît que sur ses propres commentaires.

### Tester l'arrêté 2026 (AMO facultatif/obligatoire) côté `/mon-compte`

Le script `13-amo-av-arrete-2026.sql` crée lui-même les structures nécessaires :

| Dept | Règles (`getReglesAmo`)  | Ce qui est créé                                                   |
| ---- | ------------------------ | ----------------------------------------------------------------- |
| `36` | AMO imposé               | AMO du Berry Profond + AV liée au dept 36 (pour `AllerVersLocal`) |
| `54` | AMO imposé, AV cumulant  | Soliha 54 (AMO + AV liés au dept)                                 |
| `82` | AMO facultatif, avec AMO | "AMO Tarn-et-Garonne"                                             |
| `75` | AMO facultatif, sans AMO | Aucun seed (l'absence d'AMO est ce qu'on teste)                   |

Le script est idempotent (DELETE préalable + ON CONFLICT DO NOTHING).
