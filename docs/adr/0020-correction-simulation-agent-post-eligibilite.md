# ADR-0020 : Correction d'une simulation agent après verdict d'éligibilité

**Date** : 2026-07-21
**Statut** : Accepté

## Contexte

Trois défauts remontés en QA sur l'édition des données de simulation d'un dossier
depuis l'espace agent (`/espace-agent/edition-donnees-simulation/[id]`), après le
shortcut de simulation non éligible ([ADR-0019](0019-early-exit-simulateur-agent.md)) :

1. **Un dossier devenu non éligible restait affiché « éligibilité confirmée ».** La
   sauvegarde (`updateSimulationDataAction`) écrivait `rgaSimulationDataAgent` sans
   jamais recalculer l'éligibilité ni mettre à jour `parcoursAmoValidations.statut`.
   Or le badge (`InfoDemandeur`) et le callout (`InfoDossierCallout`) sont pilotés à
   100 % par ce statut figé.
2. **Le diff « ancien → nouveau » disparaissait après correction.** `buildAgentEditInfo`
   compare `rgaSimulationData` (simulation demandeur) à `rgaSimulationDataAgent`. Pour
   un dossier **créé par un agent**, `rgaSimulationData` est vide (le demandeur n'a
   jamais simulé) : le diff retournait toujours `null`. De plus sa liste de champs
   ignorait des critères éliminatoires (type, mitoyenneté, assurance, propriétaire).
3. **Un dossier non éligible n'était plus corrigeable.** `LOGEMENT_NON_ELIGIBLE`
   n'était pas dans les `editableStatuts` : le dossier était consultable mais son
   édition renvoyait 404.

## Décision

### 1. Recalcul du statut à la sauvegarde (miroir de la création)

`updateSimulationDataAction` recalcule l'éligibilité via un helper partagé avec
`createDossierByAgent` (`eligibilite-agent.service.ts` : `evaluateAgentSimulation`,
`buildEligibiliteArchiveNote`) et, **pour un dossier dont l'éligibilité est déjà
tranchée** (`LOGEMENT_ELIGIBLE` / `LOGEMENT_NON_ELIGIBLE`), met à jour le statut de
validation dans les deux sens + archive / dé-archive le parcours
(`updateSituationParticulier`). `EN_ATTENTE` (validation AMO à venir) et `SANS_AMO` ne
sont **pas** auto-décidés par une simple correction : c'est le geste de validation /
qualification qui les tranche.

Le mail d'invitation n'est **pas** renvoyé à l'édition (contrairement à la création) :
c'est un artefact de création, et le demandeur a pu déjà réclamer le dossier.

### 2. Snapshot d'origine dédié pour le diff

Nouvelle colonne `parcours_prevention.rga_simulation_data_agent_baseline` (jsonb
nullable), capturée à la **1re correction** (données effectives avant édition).
`buildAgentEditInfo` compare désormais `baseline ?? rgaSimulationData` à
`rgaSimulationDataAgent`.

Pourquoi une colonne dédiée plutôt que réutiliser `rgaSimulationData` : ce slot pilote
la résolution territoriale **USER-first** (`getDemandeurFirstSimulation`). Y écrire la
simulation de création ferait diverger le listing (baseline) du détail (corrigé) dès
qu'une correction change le territoire — exactement le bug listing↔détail de
[RBAC-ROLES §6](../security/RBAC-ROLES.md). Le baseline ne participe donc **qu'à
l'affichage du diff**, jamais à la territorialité ni à `getEffectiveRGAData`.

### 3. Statuts éditables élargis

`LOGEMENT_NON_ELIGIBLE` rejoint `editableStatuts` (lecture `getDossierSimulationData`
**et** écriture `updateSimulationDataAction`, désormais alignées et incluant aussi
`SANS_AMO`), pour permettre la correction d'une saisie erronée. `ACCOMPAGNEMENT_REFUSE`
reste non éditable.

### 4. Champs de comparaison alignés

`buildAgentEditInfo` et l'affichage `InfoLogement` couvrent désormais les mêmes critères
éliminatoires que l'écran d'édition : ajout de **type de logement, mitoyenneté,
assurance, propriétaire occupant** (affichés + diffés). Une correction ne portant que
sur l'un d'eux est maintenant visible.

## Conséquences

- Le badge et le callout d'éligibilité reflètent la simulation courante après correction.
- Le diff réapparaît, y compris pour les dossiers créés par agent.
- `InfoLogement` affiche 4 critères supplémentaires sur les détails dossier / demande /
  prospect (données utiles, sans effet de bord).
- Le scope du recalcul est volontairement limité aux dossiers déjà tranchés : les
  workflows de validation AMO (`EN_ATTENTE`) et sans-AMO ne sont pas modifiés.
