# ADR-0010 : Actions typées sur les parcours (remplacement des commentaires libres)

**Date** : 2026-06-15
**Statut** : Accepté

> Décision déjà appliquée en production via le commit #203 (`9f9ee838`) et la
> migration `0032`, mais jamais formalisée en ADR. Ce document comble ce manque.

## Contexte

Les professionnels (agents AMO, Allers-Vers, administrateurs) pouvaient laisser des
**commentaires libres** sur un parcours, stockés dans la table `parcours_commentaires`
(simple texte partagé entre pros, invisible du demandeur). Ce modèle « fil de
commentaires » ne permettait pas de **catégoriser** les interventions (appel, visite
terrain, relance, transmission de dossier…), donc ni de filtrer ni de produire des
statistiques sur le suivi réel d'un parcours.

## Décision

> Nous remplaçons le commentaire libre par une **action typée** : la table
> `parcours_commentaires` devient `parcours_actions`, où chaque ligne est une **action
> d'un type donné** (`action_type`) assortie d'un **message optionnel**.

- `action_type` (text, NOT NULL) : valeur issue de `ACTION_TYPE_GROUPS`
  (`src/features/backoffice/espace-agent/shared/domain/types/action.types.ts`).
- `action_precision` (text, nullable) : précision libre quand `action_type = "autre"`.
- `message` : désormais **nullable** (une action peut ne porter aucun commentaire).
- Les anciens commentaires libres deviennent des actions de type **`commentaire_libre`**.
- Visibilité **inchangée** : réservée aux professionnels, jamais au demandeur.

## Options envisagées

### Option A — Action typée (`action_type` + message optionnel) (retenue)

- Avantages : suivi structuré et catégorisable (filtrage, stats par type d'action) ;
  rétro-compatible via le type `commentaire_libre` ; message reste possible.
- Inconvénients : migration de schéma + backfill ; tout nouveau code/seed doit fournir
  un `action_type`.

### Option B — Conserver le commentaire libre, ajouter un `tag` optionnel

- Avantages : pas de migration lourde, pas de NOT NULL contraignant.
- Inconvénients : typage facultatif → données non fiables pour les stats/filtres ;
  on retombe sur un fil de texte peu exploitable. Rejetée.

## Conséquences

### Positives

- Interventions des pros catégorisées → filtrage et statistiques possibles.
- Historique préservé sans perte (anciens commentaires = `commentaire_libre`).

### Négatives / Risques

- `action_type` est NOT NULL **sans valeur par défaut** : toute insertion (code, seed,
  script) doit fournir un type, sinon violation de contrainte.

### Migration

`src/shared/database/migrations/0032_rename_commentaires_to_actions.sql` :

1. `RENAME` de `parcours_commentaires` → `parcours_actions` (+ renommage des contraintes FK).
2. Ajout de `action_type` et `action_precision`.
3. Backfill `action_type = 'commentaire_libre'` sur l'existant, puis `SET NOT NULL`.
4. `message` passe `DROP NOT NULL`.

Impacts propagés : seeds `scripts/seed/sql/fake-parcours/00-init.sql` et
`07-commentaires.sql` (référençaient encore `parcours_commentaires` → corrigés, insertion
en `commentaire_libre`) ; `docs/ARCHITECTURE.md` (table et relations).

## Liens

- Schéma : `src/shared/database/schema/parcours-actions.ts`
- Types d'action : `src/features/backoffice/espace-agent/shared/domain/types/action.types.ts`
- Migration : `src/shared/database/migrations/0032_rename_commentaires_to_actions.sql`
- PR : #203 (`9f9ee838` — feat: ajout des actions)
- Documentation : [docs/ARCHITECTURE.md](../ARCHITECTURE.md), [RBAC-ROLES.md](../security/RBAC-ROLES.md)
