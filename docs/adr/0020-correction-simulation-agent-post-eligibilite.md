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

## Amendement (2026-07-23) : découplage archivage / décision de validation

Le scope ci-dessus couplait deux effets sous une même garde `decidedStatuts` : la
**décision de validation** (flip de statut) **et** l'**archivage**. Conséquence : sur un
dossier `EN_ATTENTE` / `SANS_AMO` ou un prospect, une simulation corrigée devenue
inéligible n'archivait rien — alors que la modale de confirmation promet « Le dossier sera
déplacé dans la catégorie Archivés ». UI et backend divergeaient.

**Décision** : découpler les deux effets dans `updateSimulationDataAction`.

- **Décision de validation** (flip `LOGEMENT_ELIGIBLE ↔ LOGEMENT_NON_ELIGIBLE`) : inchangée,
  **réservée aux dossiers déjà tranchés**. On n'auto-décide toujours pas un `EN_ATTENTE`
  (validation AMO à venir) ni un `SANS_AMO` — l'AMO / l'Aller-vers gardent la main.
- **Archivage** : étendu à **tous les statuts éditables** et au **chemin prospect**. Suffit
  de poser `archivedAt` (+ `situationParticulier = ARCHIVE` + note), car la catégorie
  « Archivés » est pilotée par `archivedAt` dans `getDossierEtat`, indépendamment du statut
  de validation. On ne préempte donc pas la décision AMO tout en honorant la promesse UI.

**Garde anti-régression sur le dé-archivage** : le retour automatique à l'état actif quand
la simulation redevient éligible ne s'applique **qu'aux archivages pour inéligibilité**
(note préfixée `« Non éligible »`, prédicat `isEligibiliteArchiveReason`). Un archivage
**manuel** (abandon, non-réponse, reste à charge…) n'est jamais annulé automatiquement.
Idempotence : on n'archive pas un dossier déjà archivé (`archivedAt` ne glisse pas).

**Cible du dé-archivage** : mutualisée avec le dé-archivage manuel via
`situationApresReactivation(hasAmoResponsable)` — `ELIGIBLE` si un AMO est responsable
(dossier avec entreprise), `PROSPECT` sinon (Aller-vers / vrai prospect). Évite qu'un
dossier AMO redevienne `PROSPECT`.

**Durcissement RBAC du chemin prospect (revue Codex).** Le fallback « par `parcoursId` »
(vrai prospect sans validation) — lecture `getDossierSimulationData` **et** écriture
`updateSimulationDataAction` — n'avait **aucune** garde : n'importe quel agent pouvait
éditer/archiver un parcours arbitraire, et un dossier **portant** une validation pouvait
être traité comme prospect (contournement des gardes d'ownership/statut). Gardes ajoutées,
symétriques lecture/écriture :

1. **rejet si une validation existe** pour ce `parcoursId` (l'appelant doit passer par
   l'id de validation) ;
2. **capacité `canViewDossiersWithoutAmo`** requise (ALLERS_VERS / hybride) — un AMO pur
   est exclu des prospects, même sur son territoire (`verifyProspectTerritoryAccess` ne
   gate pas cette capacité, qu'il faut donc vérifier explicitement) ;
3. **contrôle territorial** (`verifyProspectTerritoryAccess`), aligné sur le listing.

L'écriture prospect passe désormais par une **transaction unique** (simulation + archivage),
comme le chemin dossier, au lieu de deux écritures repository séquentielles.

> **Reste hors périmètre** (dette pré-existante, non régressée par cette branche) :
> `verifyProspectTerritoryAccess` ne vérifie pas `canViewDossiersWithoutAmo` en interne —
> un AMO pur peut donc atteindre un dossier `SANS_AMO` de son territoire via le **détail**.
> Le contournement est ici fermé localement (point 2) ; le durcissement central de
> `verifyProspectTerritoryAccess` est à traiter séparément. Le verrouillage concurrent
> (`FOR UPDATE`) et une éventuelle colonne `archive_origin` structurée sont également
> différés.
