# ADR-0028 : Actions automatiques sur les décisions AV et les archivages

**Date** : 2026-08-25
**Statut** : Accepté

## Contexte

Depuis [ADR-0022](0022-refus-accompagnement-demandeur-eligible.md), les trois décisions
d'éligibilité de l'**AMO** tracent une action système dans `parcours_actions`. Deux
évènements équivalents restaient muets :

- la **réponse de l'Aller-vers** (`qualifyProspect` : éligible / à qualifier / non
  éligible) — rien n'apparaissait dans l'historique du dossier ;
- l'**archivage et le dé-archivage** (`archiveDossierAction` / `unarchiveDossierAction`,
  ainsi que les archivages automatiques du chemin prospect).

Conséquences. D'abord la perte d'historique : `archived_at` ne porte qu'un état courant et
`archive_reason` est **effacée** au dé-archivage, si bien qu'un dossier archivé puis
réactivé ne garde aucune date. Ensuite, et surtout, le faussement des délais : les
indicateurs de `/administration/activite` (`delaiMoyenPremiereReponse`,
`demandeursSansReponse`) ne sont calculés qu'à partir de `parcours_actions` — un dossier
répondu par un Aller-vers comptait donc comme « sans réponse ».

Deux angles morts sont apparus pendant l'analyse. `canEditAction` n'excluait pas les types
système : l'agent auteur pouvait **supprimer sa propre trace d'audit**, rendant la mesure
des délais réécrivable. Et `parcours/amo/actions/amo-validation.actions.ts` exposait un
second chemin de validation AMO (`validerLogementEligible` / `refuserLogementNonEligible`),
sans appelant depuis que le lien email redirige vers le détail de la demande, sans garde
read-only ni audit.

## Décision

> Toute décision structurante d'un professionnel sur un dossier — réponse AV, réponse AMO,
> (dés)archivage — écrit une action système dans `parcours_actions`, datée de l'évènement.
> Ces actions sont en **lecture seule** : elles constituent la piste d'audit du dossier.

Cinq nouveaux types (texte libre, **aucune migration**) : `av_qualification_eligible`,
`av_qualification_a_qualifier`, `av_qualification_non_eligible`, `dossier_archive`,
`dossier_desarchive`.

Un helper unique `logSystemAction` (`shared/services/action-audit.service.ts`) remplace les
six duplications de « snapshot auteur + insert ». Il résout l'auteur depuis un agent déjà
chargé, un `agentId` (utilisable depuis un service ou un script ops) ou le demandeur, et
n'échoue jamais — l'audit ne doit pas invalider la mutation déjà enregistrée.

**Où le log est posé, et pourquoi ça diffère selon l'évènement :**

| Évènement                 | Point d'écriture                       | Raison                                                                                            |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Réponse Aller-vers        | `qualificationService.qualifyProspect` | Couvre d'un coup le formulaire de qualification **et** la création de dossier AV non éligible     |
| (Dés)archivage manuel     | `archiveDossierAction` / `unarchive…`  | `updateSituationParticulier` est appelé par 6+ chemins : y logger produirait des doublons partout |
| Archivage auto (prospect) | `updateSimulationDataAction`           | Un prospect n'a pas de validation AMO : rien d'autre ne daterait l'archivage                      |
| Archivage auto (création) | `creationDossierService`               | Mode `amo` seulement — en mode `av`, `qualifyProspect` trace déjà sa décision                     |

Une décision « non éligible » archive le dossier : la qualification porte l'information,
**aucun `dossier_archive` n'est ajouté par-dessus**.

Le chemin de validation AMO dupliqué est **supprimé** (avec son fichier de test), plutôt
qu'audité : le garder maintenait une porte ouverte vers des réponses AMO invisibles.

Enfin, un script ops `pnpm fix:backfill-actions-audit` (dry-run par défaut) rejoue
l'historique manquant depuis `prospect_qualifications` et `parcours_prevention.archived_at`,
en réutilisant la **date d'origine** de l'évènement.

## Options envisagées

### Option A — Log au point d'entrée le plus proche de l'évènement (retenue)

- Avantages : chaque évènement est tracé une fois et une seule ; le message peut porter le
  contexte métier (raisons d'inéligibilité en clair, raison d'archivage) ; les gardes
  d'autorisation restent là où elles sont.
- Inconvénients : la règle « où loguer » n'est pas uniforme (service ici, action là) et
  demande d'être documentée — d'où le tableau ci-dessus.

### Option B — Log centralisé dans `parcoursPreventionRepository.updateSituationParticulier`

- Avantages : impossible d'oublier un chemin d'archivage.
- Inconvénients : rédhibitoire — la méthode est appelée par la qualification, le refus
  d'accompagnement, la correction de simulation et la création de dossier, qui tracent déjà
  leur propre décision : chaque archivage produirait deux actions. Le repository n'a par
  ailleurs pas d'auteur sous la main.

### Option C — Ne rien tracer et calculer les délais depuis les tables métier

- Avantages : aucune donnée dupliquée.
- Inconvénients : il faudrait unir `prospect_qualifications`, `parcours_amo_validations` et
  `parcours_prevention` à chaque calcul, et l'historique du dossier resterait incomplet pour
  l'agent. `parcours_actions` est déjà le journal du dossier : c'est sa place.

## Conséquences

### Positives

- L'historique du dossier montre enfin qui a répondu, quand, et pourquoi le dossier a été
  mis en pause.
- Le délai de première réponse devient mesurable pour les dossiers suivis par un Aller-vers.
- La piste d'audit n'est plus réécrivable par son auteur.
- Un seul point d'écriture (`logSystemAction`) pour tous les évènements à venir.

### Négatives / Risques

- **Rupture de série sur `/administration/activite`** : `delaiMoyenPremiereReponse` baisse
  et `demandeursSansReponse` chute mécaniquement à la mise en production. Ce n'est pas un
  gain de rapidité mais un gain de mesure. Le backfill recolle la partie de l'historique
  encore présente en base, pas davantage.
- **Trous irréductibles au rattrapage** : un dé-archivage passé n'a laissé aucune trace
  (`archived_at` remis à `NULL`), et un archivage sans `archived_by` n'a pas d'auteur donc
  pas de snapshot. Le script les compte, il ne les invente pas.
- Le verrou de lecture seule s'applique **rétroactivement** aux types système existants
  (ADR-0018, ADR-0022, ADR-0024) : un agent qui pouvait supprimer sa trace ne le peut plus.
  C'est l'effet recherché, mais c'est un changement de comportement non demandé côté UI.
- La règle « où loguer » diffère selon l'évènement (cf. tableau) : un futur chemin
  d'archivage ajouté ailleurs pourrait à nouveau passer sous le radar.

### Migration (si applicable)

Aucune migration de schéma (`action_type` est du texte libre). Ordre de déploiement
recommandé : déployer, puis `pnpm fix:backfill-actions-audit` en dry-run pour mesurer le
volume, puis `--apply`. Bump `1.52.0 → 1.53.0`.

## Liens

- Helper d'audit : `src/features/backoffice/espace-agent/shared/services/action-audit.service.ts`
- Types d'action : `src/features/backoffice/espace-agent/shared/domain/types/action.types.ts` (`ACTION_TYPES_SYSTEME`, `isActionSysteme`)
- Réponse AV : `src/features/backoffice/espace-agent/prospects/services/qualification.service.ts`, `prospects/domain/qualification-audit.ts`
- Archivage : `src/features/backoffice/espace-agent/dossiers/actions/archive-dossier.actions.ts`
- Verrou lecture seule : `src/features/backoffice/espace-agent/shared/services/actions.service.ts`, `src/app/(backoffice)/espace-agent/shared/components/Actions/ActionItem.tsx`
- Script de rattrapage : `scripts/ops/fix/backfill-actions-audit.ts` (`pnpm fix:backfill-actions-audit`)
- Documentation : `docs/parcours/FLOW-AND-SYNC.md` (§2.9), `docs/security/RBAC-ROLES.md` (§6.1.2)
- ADR liés : [ADR-0018](0018-arret-accompagnement-amo.md), [ADR-0020](0020-correction-simulation-agent-post-eligibilite.md), [ADR-0022](0022-refus-accompagnement-demandeur-eligible.md), [ADR-0024](0024-commentaires-super-admin-espace-agent.md)
