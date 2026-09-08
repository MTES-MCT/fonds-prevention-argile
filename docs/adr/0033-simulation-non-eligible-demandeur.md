# ADR-0033 : Enregistrer et archiver la simulation non éligible du demandeur

**Date** : 2026-09-07
**Statut** : Accepté

## Contexte

Plus de 120 demandeurs en base n'ont **aucun département** : ni AMO ni Aller-vers ne peut
les voir (le filtrage territorial passe par `rgaSimulationData.logement`), aucune
catégorisation n'est possible, et le tableau de bord ne sait pas quoi en dire. Les réponses
au questionnaire Tally montrent qu'une partie d'entre eux est en réalité **non éligible** :
leur simulation le disait, mais personne ne l'a jamais su.

Deux causes, toutes deux dans le simulateur :

1. **La simulation non éligible n'était écrite nulle part.** `commitToRGAStore` était gardé
   par `if (isEligible && answers)` et n'était appelé que par le CTA de l'écran
   `ResultEligible`. L'écran `ResultNonEligible` n'a aucun CTA : ses réponses mouraient dans
   le store de session.
2. **L'early exit coupait avant l'adresse.** Le premier critère éliminatoire évalué est le
   type de logement (étape 2), l'adresse n'est demandée qu'à l'étape 3 : un « appartement »
   n'avait donc ni commune ni département, même si on avait enregistré sa simulation.

Conséquence visible côté demandeur : une **boucle sans issue**. `/mon-compte` affiche
`SimulationNeededAlert` tant que `rgaSimulationData` est vide, renvoie vers le simulateur,
qui ne conserve rien — indéfiniment.

Le chemin agent, lui, traitait déjà correctement ce cas : `createDossierByAgent` évalue la
simulation, écrit une qualification `non_eligible` et archive le parcours.

## Décision

> Nous enregistrons la simulation du demandeur **quel que soit son verdict**, et une
> simulation non éligible **archive** le parcours en écrivant une qualification
> `prospect_qualifications` **sans agent** (`agent_id = NULL`).

Quatre conséquences directes :

- l'early exit du simulateur public est **différé jusqu'à l'adresse**
  (`DEFAULT_DEFER_EARLY_EXIT_UNTIL`), comme le wizard Aller-vers le faisait déjà ;
- un demandeur **déjà connecté** écrit en base **dès l'écran de résultat**, sans attendre un
  retour sur `/mon-compte` — seul endroit où tourne `useMigrateRGAToDB`, et où un non éligible
  ne repasse pas ;
- la raison d'archivage est la valeur canonique `RAISON_ARCHIVAGE_NON_ELIGIBLE`
  (« Non éligible au dispositif »), pas la note détaillée ;
- l'audit est écrit avec le demandeur pour auteur
  (`ACTION_TYPE_SIMULATION_NON_ELIGIBLE`, `agent_id = NULL`).

## Options envisagées

### Option A — Qualification sans agent + archivage (retenue)

- Avantages : tout l'aval fonctionne sans modification — `getMyIneligibiliteData` (donc le
  callout « Vous n'êtes pas éligible » côté demandeur), la catégorie « Archivés » de l'espace
  agent (`getDossierEtat` lit `archivedAt`), et surtout la distribution des raisons
  d'inéligibilité du tableau de bord, qui fait un `innerJoin` sur `prospect_qualifications`
  et un filtre exact sur `archive_reason`. `agent_id` est déjà nullable (suppression d'agent).
- Inconvénients : la table s'appelle `prospect_qualifications` et portait jusqu'ici la seule
  décision d'un agent Aller-vers ; une ligne sans agent en élargit la sémantique.

### Option B — Archivage seul (`archived_at` + `archive_reason`)

- Avantages : aucune écriture dans une table « agent », sémantique inchangée.
- Inconvénients : le dossier serait archivé mais **non catégorisé** — invisible des stats
  d'inéligibilité (qui exigent la jointure) et sans raison exploitable. C'est précisément le
  manque qu'on cherche à combler.

### Option C — Réutiliser `qualificationService.qualifyProspect`

- Avantages : un seul point d'écriture pour toutes les qualifications.
- Inconvénients : la méthode exige un `agentId` (typé `string`) et trace une action
  `av_qualification_non_eligible` — ce qui ferait entrer les simulations demandeur dans les
  indicateurs de **délai de réponse Aller-vers** de `/administration/activite`, en les
  faussant. Un service dédié garde la mesure honnête.

## Conséquences

### Positives

- Les non éligibles sont catégorisés, archivés et comptés ; ils sortent du silence.
- Ils ont désormais un département dans tous les cas, donc un territoire de rattachement.
- La boucle « Éligibilité manquante » disparaît : `/mon-compte` affiche le callout
  « Vous n'êtes pas éligible » au lieu de renvoyer au simulateur.
- Symétrie complète avec la correction de simulation par un agent
  (`updateSimulationDataAction`) : mêmes helpers, même raison d'archivage, même
  dé-archivage automatique si la simulation redevient éligible.

### Négatives / Risques

- Une question de plus (l'adresse) pour les visiteurs « appartement » du simulateur public :
  coût de conversion assumé, à surveiller côté Matomo.
- Le volume de parcours archivés va augmenter mécaniquement ; les séries « demandes
  inéligibles » d'avant et d'après ne sont pas comparables.
- Le simulateur reste public et écrase `rgaSimulationData` à chaque migration. Garde posée :
  aucun archivage ni dé-archivage si un formulaire DN a déjà été **déposé** — l'état du
  dossier appartient alors à la DDT et aux professionnels.

### Migration

Aucune. Les 120+ parcours existants **ne sont pas rattrapables** : leur simulation n'a
jamais été écrite, il n'y a rien à rejouer. Seul un rapprochement manuel avec les réponses
Tally permettrait de les traiter.

## Liens

- `src/features/simulateur/domain/services/eligibilite-archivage.service.ts` (helpers partagés
  demandeur/agent, extraits de `backoffice/espace-agent/shared/services/eligibilite-agent.service.ts`)
- `src/features/simulateur/stores/simulateur.store.ts` (`DEFAULT_DEFER_EARLY_EXIT_UNTIL`)
- `src/features/simulateur/hooks/useSimulateurFormulaire.ts` (`commitToRGAStore`)
- `src/features/parcours/core/services/simulation-eligibilite.service.ts`
- `src/features/parcours/core/actions/parcours-simulateur-rga-migration.actions.ts`
- `src/features/parcours/amo/domain/value-objects/statutValidation.ts` (`estLogementNonEligible`)
- `src/features/backoffice/administration/shared/services/couverture-territoriale.service.ts`
- [ADR-0020](0020-correction-simulation-agent-post-eligibilite.md) — correction de simulation
  par un agent, dont ce flux est le miroir demandeur
- [ADR-0028](0028-actions-automatiques-decisions-et-archivage.md) — actions système d'audit
