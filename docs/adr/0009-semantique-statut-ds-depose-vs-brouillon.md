# ADR-0009 : Sémantique du statut DS — `en_construction` signifie « déposé », `ds_status` nullable, dates de dépôt et d'instruction

**Date** : 2026-06-10
**Statut** : Accepté

## Contexte

Les dossiers du parcours reposent sur Démarches Simplifiées ([ADR-0004](0004-demarches-simplifiees-backbone.md)), dont le modèle d'état est synchronisé côté interne ([ADR-0007](0007-modele-etat-parcours-sync-ds.md)).

Côté DS, le statut `en_construction` **ne signifie pas « brouillon »** : il signifie que l'usager a cliqué « Déposer » — son dossier est **soumis et en attente d'instruction** par la DDT. Un dossier créé mais pas encore soumis n'a, lui, **aucun statut** côté DS.

Or notre code créait le dossier directement avec `ds_status = EN_CONSTRUCTION` et `submitted_at = now()` à la création, comme s'il s'agissait d'un brouillon. Conséquences :

- les statistiques comptaient des dossiers jamais soumis comme des dépôts ;
- l'espace demandeur affichait « en construction / à faire » alors que le dossier était soit non soumis, soit au contraire bien déposé ;
- impossible de distinguer un **premier dépôt** (en attente de prise en instruction) d'un **retour de correction** (dossier renvoyé en construction par la DDT pour complément) ;
- `submitted_at` portait la date de création, pas la date réelle de dépôt.

De plus, DS expose `datePassageEnConstruction` (date de dépôt) et `datePassageEnInstruction` (prise en instruction) que nous n'exploitions pas.

## Décision

Nous alignons notre modèle sur la sémantique réelle de DS.

> `ds_status = NULL` tant que le dossier n'est pas déposé ; `EN_CONSTRUCTION` signifie « déposé, en attente d'instruction » ; les dates de dépôt et d'instruction proviennent de DS et font foi.

Concrètement :

1. **`ds_status` devient nullable** (`NULL` = dossier créé dans DS mais pas encore soumis). Le défaut `EN_CONSTRUCTION` est supprimé. Migration `0034_nullable_ds_status`.
2. **Nouvelle colonne `instructed_at`** : date de passage en instruction, distincte de `submitted_at` (date de passage en construction = dépôt).
3. **Création sans dépôt** : `createDossierForCurrentStep` ne pose plus `ds_status` ni `submitted_at` — on attend la sync DS.
4. **La sync DS écrit les dates** : `getDossierStatus()` remonte `{ state, datePassageEnConstruction, datePassageEnInstruction }` ; `updateDossierStatus` écrit `submitted_at` / `instructed_at` en `COALESCE` (ne jamais écraser une date déjà connue), même lorsque le statut est inchangé. `recomputeParcoursStatus` ignore les dossiers sans statut.
5. **Distinction 1er dépôt vs retour de correction** : un dossier en `EN_CONSTRUCTION` avec `instructed_at` renseigné a déjà été instruit une fois → il a été **renvoyé en construction** par la DDT pour correction. Sans `instructed_at`, c'est un **premier dépôt**.
6. **Backfill** : les dossiers jamais synchronisés (`last_sync_at IS NULL`) étaient de faux dépôts → repassés à `NULL`. Un dossier réellement déposé a forcément été synchronisé au moins une fois, donc son statut est préservé.

Le mapping `DS_TO_INTERNAL_STATUS` (`EN_CONSTRUCTION → TODO`, cf. [FLOW-AND-SYNC §3.2](../parcours/FLOW-AND-SYNC.md)) **n'est pas modifié** : cette décision porte sur la sémantique de `ds_status` et l'affichage, pas sur la machine d'état interne du parcours.

## Options envisagées

### Option A — `ds_status` nullable + dates issues de DS (retenue)

- Avantages : modèle fidèle à DS ; distingue nativement « non soumis », « déposé », « en instruction », « instruit » ; dates exactes ; permet de séparer 1er dépôt et retour de correction ; stats et affichages corrects.
- Inconvénients : `ds_status` nullable à gérer partout (types `| null`, gardes) ; backfill heuristique sur la donnée de prod ; un dossier `EN_CONSTRUCTION` (déposé) reste mappé en `TODO` interne, ce qui est cohérent mais peu intuitif.

### Option B — Garder `ds_status` non-null et ajouter un statut applicatif `BROUILLON`

- Avantages : pas de nullable à propager.
- Inconvénients : invente un état qui n'existe pas dans DS ; risque de redivergence avec la source de vérité ; mapping supplémentaire à maintenir.

### Option C — Déduire l'état du seul `submitted_at`

- Avantages : aucune migration de colonne.
- Inconvénients : `submitted_at` portait une date de création erronée ; ne distingue pas dépôt initial et retour de correction ; ne capture pas la date d'instruction.

## Conséquences

### Positives

- Statistiques « En cours de création / Déposés / En instruction DDT / Dossiers instruits » exactes (`RepartitionDossiersCards`).
- Espace agent : `InfoDossierCallout` distingue 1er dépôt et retour de correction via `instructed_at` ; badge « En cours de création » quand pas de statut.
- Espace demandeur : « à faire » (pas de statut) vs « en attente d'instruction » (`EN_CONSTRUCTION`) sur toutes les étapes ; « En instruction depuis le … » s'appuie sur `instructed_at`.
- Détection ops du bug double-progression : un brouillon jetable est désormais `ds_status = NULL` (et non plus `EN_CONSTRUCTION`), `EN_CONSTRUCTION` valant désormais « vrai dépôt » (`a_reviewer`).

### Négatives / Risques

- Le backfill est heuristique (`last_sync_at IS NULL`) : un dossier réellement déposé mais jamais synchronisé serait à tort repassé à `NULL`. Risque considéré faible (la sync tourne 3×/jour).
- `ds_status | null` doit être manipulé avec prudence (types, gardes) dans tout nouveau code consommant la table.

### Migration

- `0034_nullable_ds_status` : `ds_status` DROP NOT NULL + DROP DEFAULT, ajout `instructed_at`, backfill `UPDATE … SET ds_status = NULL WHERE last_sync_at IS NULL`.
- Appliquer avec `pnpm db:migrate`.

## Cohérence de `current_status` à la création

La sémantique ci-dessus a révélé une incohérence sur `current_status` (l'état interne du parcours, cf. [ADR-0007](0007-modele-etat-parcours-sync-ds.md)) au moment de la création d'un dossier.

`current_status` n'a que 3 valeurs (`todo | en_instruction | valide`) pour 4 états réels (pas déposé / déposé en attente / en instruction / instruit). La vérité fine est portée par `ds_status` ; `current_status` n'est qu'un dérivé grossier. Le mapping `DS_TO_INTERNAL_STATUS` (`EN_CONSTRUCTION → TODO`) **n'est pas modifié**.

Décision : **`current_status` n'est plus posé optimistement à `EN_INSTRUCTION` à la création d'un dossier ; il reste `TODO` jusqu'à ce que la sync DS constate la prise en instruction.**

- `diagnostic.service` posait `EN_INSTRUCTION` à la création (alors que `eligibilite.service` posait déjà `TODO`) → aligné sur `TODO`.
- L'action `creerDossier` (code mort, posait `EN_INSTRUCTION` + servait de verrou anti-doublon via `canCreateDossier`) est supprimée.
- `eligibilite.service` gagne une garde d'idempotence (`getDossierByStep`) puisque le bump de statut ne sert plus de verrou anti-doublon.
- L'état « qui détient la balle » (`getDossierEtat`, badge DDT/ménage du listing agent) et le `InfoDossierCallout` sont pilotés par `ds_status` (et `instructedAt` pour distinguer 1er dépôt et retour de correction), et non plus par `current_status`.

Effets : un dossier fraîchement créé non déposé n'apparaît plus « en instruction » côté agent ; un dossier déposé en attente est correctement attribué à la DDT ; la validation manuelle (`canValidateDossier`, gate `EN_INSTRUCTION`) n'est plus possible avant que la DDT instruise réellement.

## Liens

- ADR liés : [ADR-0004](0004-demarches-simplifiees-backbone.md), [ADR-0007](0007-modele-etat-parcours-sync-ds.md)
- Documentation flux : [docs/parcours/FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md) (§1.2, §1.3, §2, §3.2)
- Migration : `src/shared/database/migrations/0034_nullable_ds_status.sql`
- Sync DS : `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`, `src/features/parcours/dossiers-ds/services/dossier-ds.service.ts`, `src/features/parcours/dossiers-ds/adapters/graphql/client.ts`
- `current_status` à la création : `src/features/parcours/core/services/diagnostic.service.ts`, `src/features/parcours/core/services/eligibilite.service.ts`
- État DDT/ménage : `src/features/parcours/core/domain/services/dossier-etat.service.ts`, `src/features/backoffice/espace-agent/dossiers/services/responsable-resolver.service.ts`
- Affichage agent : `src/app/(backoffice)/espace-agent/dossiers/[id]/components/InfoDossierCallout.tsx`
- Affichage demandeur : `src/features/parcours/core/components/steps/`, `src/features/parcours/core/components/MonCompteClient.tsx`
- Détection ops : `scripts/ops/lib/double-progression.ts`
