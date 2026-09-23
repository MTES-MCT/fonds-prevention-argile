# ADR-0038 : La qualification de l'Aller-vers décide de l'accompagnement

**Date** : 2026-09-21
**Statut** : Accepté

## Contexte

Des dossiers stagnaient entre Aller-vers et AMO sans que personne ne sache qui devait agir.
Trois causes distinctes, toutes vérifiées dans le code.

**1. La transmission à l'AMO échouait en silence sur les dossiers créés par un agent.** Un
dossier créé par un Aller-vers démarre à l'étape `invitation` et y reste jusqu'au rattachement
du compte FranceConnect (`findOrCreateForUser`). Or `assignAmoAutomatiqueForUser` **et**
`selectAmoForUser` exigeaient tous deux l'étape `choix_amo`. L'appel depuis `qualifyProspect`
étant best-effort et journalisé par un simple `console.warn`, l'agent qualifiait « éligible »,
croyait avoir passé la main, et le dossier restait chez lui. Le rattrapage ne venait que si le
demandeur se connectait à `/mon-compte` — et le script `pnpm fix:lier-amo-oblig` filtrait lui
aussi sur `choix_amo`, dans ses **deux** gardes : il ne voyait pas ces dossiers non plus.

**2. L'enum `AmoMode` confondait deux règles départementales indépendantes.** Ses trois valeurs
exclusives (`OBLIGATOIRE`, `AV_AMO_FUSIONNES`, `FACULTATIF`) forçaient un département à choisir
entre « l'AMO y est imposé » et « l'aller-vers y est aussi l'AMO ». Le Gers relève des deux
formulations à la fois : cumul **sans** obligation. L'y inscrire comme « fusionné » lui retirait
le droit à l'autonomie (`peutPasserEnAutonomie` testait `=== FACULTATIF`) et déclenchait
l'attribution silencieuse d'une AMO à l'arrivée sur `/mon-compte`.

**3. Le demandeur devait redemander ce qu'il venait de dire à l'agent.** Après une
qualification « éligible » en département à AMO facultatif, rien n'était transmis : le demandeur
retrouvait l'écran de choix d'accompagnement. Et là où l'aller-vers est lui-même l'AMO, la
sollicitation partait quand même — la structure recevait un email lui demandant de valider ce
qu'elle venait d'établir.

## Décision

> La qualification « éligible » de l'Aller-vers décide de l'accompagnement, au lieu de
> renvoyer la question au demandeur. Les deux règles départementales deviennent des prédicats
> indépendants, et l'étape `invitation` tient jusqu'au claim.

Quatre changements liés :

1. **Deux axes séparés** : `estAmoObligatoire` (l'AMO est imposé) et `avCumuleAmo`
   (l'aller-vers est aussi l'AMO). Seul le premier retire une liberté au demandeur.
2. **La transmission accepte l'étape `invitation`**, via la constante partagée
   `ETAPES_SELECTION_AMO`, et son verdict remonte à l'agent.
3. **L'Aller-vers tranche l'accompagnement** là où l'AMO est facultatif
   (`accompagnement_souhaite` : accompagnement, autonomie, ou « ne sait pas » qui rend la main).
4. **Sa qualification vaut validation AMO** quand le département reconnaît le cumul, que
   l'agent porte la casquette AMO par son rôle, et que son entreprise couvre la commune.

## Options envisagées

### Option A — Deux prédicats indépendants, étape `invitation` conservée (retenue)

- Avantages : le Gers est représentable ; la promotion de la simulation de l'agent au claim
  reste protégée (elle vit dans `if (currentStep === INVITATION)`) ; chaque garde lit
  exactement la règle qui la concerne.
- Inconvénients : ~14 sites de branchement à migrer, `AmoMode` supprimé du code.

### Option B — Garder `AmoMode` en donnant la priorité à `OBLIGATOIRE`

- Avantages : diff minimal, aucun appelant à toucher.
- Inconvénients : **ne corrige pas le Gers**, qui n'est justement pas obligatoire. Il faudrait
  corriger séparément l'autonomie, le callout d'attente, le tableau public, « Ma liste » et les
  scripts ops — soit les mêmes fichiers, sans la règle explicite.

### Option C — Sortir `invitation` dès qu'un accompagnement est décidé

- Avantages : le parcours reflète immédiatement l'accompagnement, sans routage au claim.
- Inconvénients : fait perdre définitivement la simulation saisie par l'agent. La promotion vers
  `rgaSimulationData` est conditionnée à cette étape, et `migrateSimulationDataToDatabase` ne la
  rattrape pas (elle retourne `enregistree: true` sans promouvoir dès qu'une simulation agent
  complète existe). Le bug existait déjà via `approveValidation`, qui acceptait `INVITATION`.

### Option D — Enchaîner `selectAmoForUser` puis `approveValidation` pour le cas fusionné

- Avantages : réutilise deux services existants, sans nouveau chemin d'écriture.
- Inconvénients : le premier envoie précisément l'email de demande que ce cas doit supprimer.

## Conséquences

### Positives

- Un dossier qualifié éligible part chez l'AMO sans attendre que le demandeur crée son compte.
- L'agent voit si la transmission a réussi, au lieu d'un `console.warn`.
- Une structure cumulant les deux rôles ne se demande plus de valider son propre travail.
- Le demandeur n'est sollicité que lorsque l'agent a répondu « il ne sait pas encore ».
- `A_AMO` (Brevo) reflète l'état réel à la création du compte.

### Négatives / Risques

- Les listes départementales par défaut changent (`03,04,36,47,54,63,81` et `03,04,32,54,63`).
  Elles ne s'appliquent que si les variables `NEXT_PUBLIC_DEPARTEMENTS_*` ne sont **pas**
  définies côté Scalingo : là où elles le sont, l'activation reste une opération d'infra.
- `avCumuleAmo` ne déclenche plus d'attribution d'office. Un département qui aurait été
  configuré « fusionné » en comptant sur cet effet doit être ajouté aux départements à AMO
  imposé.
- La concurrence entre qualification, claim et réponse AMO n'est couverte que par des écritures
  conditionnelles (`onConflictDoNothing`, UPDATE conditionnels) : un test d'intégration base
  reste à écrire, les tests unitaires actuels mockent la couche DB.

### Migration

- Migration `0049` : colonne `accompagnement_souhaite` sur `prospect_qualifications`, nullable
  et sans valeur rétroactive — `null` signifie « question non posée », jamais « ne sait pas ».
- Dossiers déjà bloqués : `pnpm fix:lier-amo-oblig` (dry-run par défaut), dont l'inventaire et
  le mode ciblé couvrent désormais `invitation`.
- Aucune reprise nécessaire sur les parcours déjà transmis : les écritures sont idempotentes.

## Liens

- Règles départementales : `src/features/parcours/amo/domain/value-objects/departements-amo.ts`
- Suite d'une qualification : `src/features/backoffice/espace-agent/prospects/services/suite-qualification.service.ts`
- Transmission et autonomie : `src/features/parcours/amo/services/amo-selection.service.ts`
- Routage au claim : `src/shared/database/repositories/parcours-prevention.repository.ts` (`validateInvitation`)
- Ouverture d'étape : `src/features/parcours/amo/services/ouverture-eligibilite.service.ts`
- Documentation : [FLOW-AND-SYNC §2.3](../parcours/FLOW-AND-SYNC.md), [RBAC-ROLES §6.1.0](../security/RBAC-ROLES.md)
- Amende : [ADR-0037](0037-pas-d-autonomie-en-amo-obligatoire.md) (l'autonomie lit désormais `estAmoObligatoire`)
