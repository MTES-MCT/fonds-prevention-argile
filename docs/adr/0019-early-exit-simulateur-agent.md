# ADR-0019 : Early exit du simulateur lors d'une création de dossier par un agent

**Date** : 2026-07-20
**Statut** : Accepté

## Contexte

Un agent (AMO, Aller-vers, ou les deux) peut créer un dossier avec simulation, souvent
**au téléphone avec le demandeur**. Dès qu'un critère est éliminatoire, le demandeur cesse
fréquemment de communiquer ses informations : il ne voit pas l'intérêt de détailler ses
revenus ou son assurance pour un fonds auquel il n'a pas droit.

Or le wizard agent parcourait les **9 étapes jusqu'au bout** avant de rendre son verdict,
là où le simulateur public coupe court dès le premier critère bloquant. L'agent se
retrouvait donc incapable de terminer la saisie — et donc de créer le dossier — faute
d'informations qu'il n'obtiendrait jamais.

La cause était un flag unique, `editMode`, portant **deux sémantiques distinctes** :

| Sémantique                          | Édition AMO | Wizard invitation |
| ----------------------------------- | ----------- | ----------------- |
| `skipEarlyExit`                     | oui         | **non** (bug)     |
| `preserveAnswers` au retour arrière | oui         | oui               |

L'édition AMO a un besoin légitime de désactiver l'early exit (l'agent ne re-saisit pas
tout, un critère non évalué ne doit pas bloquer). Le wizard invitation, lui, part d'une
saisie vierge : les deux besoins divergent.

## Décision

### 1. Un flag `earlyExit` orthogonal à `editMode`

`useSimulateurStore` expose désormais `earlyExit` (défaut `true`) et
`setEarlyExit(earlyExit, deferUntil?)`. `submitAnswer` passe `skipEarlyExit: !earlyExit` ;
`goBack` reste piloté par `editMode`. Les deux points d'entrée agent sont explicites :

- `SimulateurEdition` (édition AMO) : `setEditMode(true)` + `setEarlyExit(false)` — comportement inchangé.
- `SimulateurEditionInvitation` (wizard) : `setEditMode(true)` + `setEarlyExit(true, ADRESSE)`.

Alternative écartée : un mode enum `"public" | "edition" | "invitation"`. Les deux flags
sont réellement indépendants ; un enum aurait forcé à ré-énumérer les combinaisons à
chaque nouveau point d'entrée.

### 2. L'early exit est différé jusqu'à l'adresse

`TYPE_LOGEMENT` précède `ADRESSE`. Sortir immédiatement sur « appartement » enregistrerait
un dossier **sans `code_departement` ni `epci`** : `matchesTerritoire` échoue et le dossier
devient **invisible pour l'aller-vers qui vient de le créer** (cf. RBAC-ROLES §6 — pour un
user stub, la résolution USER-first retombe sur `rgaSimulationDataAgent`).

`SimulationService.submitAnswer` accepte donc `deferEarlyExitUntil` : l'early exit n'est
armé qu'une fois cette étape répondue. Coût pour l'agent : un écran au lieu de zéro — il a
de toute façon besoin de l'adresse pour que le dossier soit exploitable.

Alternative écartée : réordonner `ADRESSE` avant `TYPE_LOGEMENT`, qui aurait modifié le
simulateur public pour un besoin purement backoffice.

### 3. La simulation partielle est persistée telle quelle

`ResultInvitation` bloquait sur `toRGASimulationData`, qui renvoie `null` si la simulation
est incomplète. Un nouveau `toPartialRGASimulationData` lève cette exigence pour le seul cas
non éligible (une simulation éligible est complète par construction). La colonne JSONB
tolère déjà l'objet partiel — même compromis assumé que `buildMinimalAgentSimulation`.

**Aucune modification serveur** : `createDossierByAgent` appelait déjà
`EligibilityService.evaluate`, qui pratique l'early exit. Il archive donc correctement une
simulation partielle non éligible (`qualifyProspect(NON_ELIGIBLE)` en `av`,
`LOGEMENT_NON_ELIGIBLE` + `ARCHIVE` en `amo`) et saute l'email d'invitation.

## Conséquences

- L'agent crée le dossier dès l'inéligibilité tranchée, sans réclamer d'informations
  que le demandeur ne donnera pas.
- Les critères non atteints s'affichent « — » dans `EligibilityChecksList` (déjà géré).
- Un dossier non éligible créé par early exit porte une simulation partielle : tout
  nouveau lecteur de `rgaSimulationDataAgent` doit chaîner en optionnel.
- L'écran de résultat, le stepper et les emails sont inchangés.
