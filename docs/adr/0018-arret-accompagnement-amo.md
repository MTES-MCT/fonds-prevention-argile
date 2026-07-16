# ADR-0018 : Arrêt de l'accompagnement AMO et mandataire financier

**Date** : 2026-07-16
**Statut** : Accepté

## Contexte

L'AMO étant devenu facultatif (arrêté du 23 avril 2026), un demandeur accompagné doit
pouvoir repasser en autonomie. Symétriquement, un AMO doit pouvoir cesser d'accompagner
un demandeur. Jusqu'ici aucun écran ne le permettait : le seul chemin était le script ops
`pnpm fix:detacher-amo` (cf. FLOW-AND-SYNC §2.5).

Nouveauté produit : l'AMO peut se déclarer **mandataire financier** du dossier au moment
d'attester l'éligibilité. Ce statut porte un **engagement contractuel** : le demandeur ne
peut alors plus annuler unilatéralement, l'accord de l'AMO devient nécessaire.

## Décision

### 1. L'état « en autonomie » reste `SANS_AMO`, sans nouvel état

L'arrêt réutilise l'invariant existant : `parcours_amo_validations.statut = sans_amo`

- `attribution_mode = aucun` + `entreprise_amo_id = NULL`. La règle « responsable
  sticky » (`getResponsableDossier`) relâche l'AMO **précisément** sur `SANS_AMO` : le
  responsable bascule automatiquement sur l'aller-vers du territoire. Aucun statut ni
  colonne d'état supplémentaire.

Conséquence assumée : l'AMO qui arrête **perd immédiatement l'accès au dossier**
(`canAccessDossier` refuse un dossier sans entreprise). C'est le sens de « le dossier est
archivé » de la maquette : il sort de son périmètre, mais **`archived_at` n'est pas posé**
— le dossier continue sa vie en autonomie sous l'aller-vers.

### 2. Une seule colonne nouvelle : `demande_arret_at`

`parcours_amo_validations.demande_arret_at` (timestamp nullable) : non-NULL = le
demandeur a demandé l'arrêt et attend la réponse de son AMO mandataire. Remise à NULL à
la décision (acceptation → détachement ; refus → simple reset). Pilote le bandeau
d'alerte côté AMO.

### 3. Un service de détachement partagé (pattern ADR-0016)

`detacherAmo` (`detachement-amo.service.ts`) est extrait du script ops et devient la
mutation unique, appelée par : le script CLI, l'annulation demandeur, et l'arrêt AMO.
Les gardes de permission vivent dans les server actions, pas dans le service.

### 4. Arbre de décision de l'annulation demandeur

| Condition                                                | Effet                                              |
| -------------------------------------------------------- | -------------------------------------------------- |
| Département où l'AMO est **obligatoire**                 | bloqué (l'autonomie n'y existe pas)                |
| Éligibilité DN `en_instruction`                          | bloqué (plus de changement possible)               |
| Statut `en_attente` (AMO pas encore validante)           | détachement immédiat + mail d'info                 |
| `logement_eligible` et `est_mandataire_financier ≠ true` | détachement immédiat + mail d'info                 |
| `logement_eligible` et `est_mandataire_financier = true` | `demande_arret_at` posé + mail de demande d'accord |

`est_mandataire_financier = null` (question non posée, ou lignes antérieures à la
feature) est traité comme **non-mandataire** : on ne bloque pas un demandeur sur une
donnée absente. Le prédicat est pur et partagé UI ↔ service
(`peutAnnulerAccompagnement`, `requiertAccordAmo`) pour éviter que l'écran et le serveur
divergent.

L'annulation est **réservée aux départements en mode `FACULTATIF`** : là où l'AMO est
obligatoire (`NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE`, par défaut 03/36/47/54/81),
l'autonomie n'existe pas. C'est exactement la garde que porte déjà `skipAmoStepForUser` —
la dupliquer ici évite que les deux chemins de « passage en autonomie » divergent. Côté
UI, `MaListe` masque le lien sur le même critère.

## Options envisagées

### Modélisation de la demande d'arrêt

#### Option A — colonne `demande_arret_at` (retenue)

Un seul timestamp nullable, effacé à la décision. Suffit à piloter le bandeau et
l'idempotence (UPDATE conditionné sur `IS NULL`).

#### Option B — nouveau statut de validation (`arret_demande`)

Écartée : `statut` décrit la **validation** de l'accompagnement, pas une demande en
cours. Un nouveau statut aurait pollué toutes les exhaustivités existantes
(`STATUTS_CONSULTABLES`, `isValidationRefusee`, mappings UI) pour un état transitoire.

### Périmètre de permission de l'arrêt AMO

#### Option A — `assertCanActAsResponsable` (retenue)

L'AMO qui arrête est par définition le responsable courant du dossier. Réutilise la
garde déjà employée par `archiveDossierAction`, sans élargissement.

#### Option B — prédicat élargi façon `canReopenRefusedDemande`

Écartée : l'élargissement de l'ADR-0016 répondait à un cas produit précis (un AV doit
pouvoir ré-ouvrir un dossier de son territoire portant une AMO). Ici, aucun rôle autre
que l'AMO responsable n'a de raison d'arrêter un accompagnement.

### Audit

Trois types d'action **système** dans `parcours_actions` (pas de migration,
`action_type` est du texte libre validé applicativement) : `accompagnement_arrete`,
`arret_accompagnement_demande`, `arret_accompagnement_refuse`. Déclarés hors
`ACTION_TYPE_GROUPS` : affichables dans l'historique, non sélectionnables au formulaire
— même mécanique que `dossier_reouvert` (ADR-0016).

Les actions déclenchées par le demandeur portent `agent_id = null` et
`author_structure_type = "DEMANDEUR"` (nouvelle valeur de `StructureType`).

## Conséquences

### Positives

- Le script ops et l'UI ne peuvent plus diverger : une seule mutation de détachement.
- L'état « en autonomie » devient enfin visible côté demandeur — le `innerJoin` de
  `getValidationAmo` masquait toute validation `SANS_AMO`, rendant ces branches d'UI
  inatteignables (bug corrigé au passage).
- Tout le monde voit pourquoi un accompagnement s'est arrêté (raisons dans l'audit).

### Négatives / points d'attention

- L'AMO perd l'accès au dossier dès l'arrêt : l'UI doit rediriger vers le listing, et le
  mail d'information pointe le listing (et non le dossier, qui renverrait un 404).
- Le snapshot d'auteur doit être construit **avant** la mutation, sans quoi l'agent n'est
  déjà plus rattaché au dossier.
- L'envoi d'email reste best-effort (non bloquant), comme dans `amo-selection.service.ts`.

### Migration

`0038_fat_spacker_dave.sql` : `parcours_amo_validations.demande_arret_at` (nullable).
La colonne `est_mandataire_financier` a été ajoutée séparément (`0037_gray_tusk.sql`).

## Liens

- Services : `src/features/parcours/amo/services/detachement-amo.service.ts`, `src/features/parcours/amo/services/arret-accompagnement.service.ts`
- Prédicats purs : `src/features/parcours/amo/domain/value-objects/arretAccompagnement.ts`
- Server actions : `src/features/parcours/amo/actions/arret-accompagnement.actions.ts` (demandeur), `src/features/backoffice/espace-agent/dossiers/actions/arret-accompagnement.actions.ts` (AMO)
- Audit : `src/features/backoffice/espace-agent/shared/domain/types/action.types.ts`
- Emails : `src/shared/email/actions/send-arret-accompagnement.actions.ts`
- UI : `src/features/parcours/amo/components/steps/AnnulerAccompagnementModal.tsx`, `src/app/(backoffice)/espace-agent/shared/components/ArretAccompagnementModal.tsx`, `src/app/(backoffice)/espace-agent/dossiers/[id]/components/GererDossierMenu.tsx`
- Script : `scripts/ops/fix/detacher-amo.ts`
- ADR liés : [ADR-0016](0016-reouverture-demande-refusee.md) (pattern service partagé + audit), [ADR-0010](0010-actions-typees-parcours.md) (actions typées)
