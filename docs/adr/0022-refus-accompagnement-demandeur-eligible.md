# ADR-0022 : Refus d'accompagnement d'un demandeur éligible par l'AMO

**Date** : 2026-07-23
**Statut** : Accepté

## Contexte

Sur l'écran « Le demandeur est-il éligible au dispositif ? » (détail d'une demande AMO,
`espace-agent/demandes/[id]`), l'AMO ne disposait que de deux réponses : « éligible et
j'accompagne » (`LOGEMENT_ELIGIBLE`) ou « non éligible » (`LOGEMENT_NON_ELIGIBLE`).

Or un cas fréquent manquait : le demandeur **est éligible**, mais l'AMO **ne peut pas
l'accompagner** (injoignable, ne rappelle pas, plus disponible…). Faute d'option dédiée,
l'AMO devait soit refuser à tort pour « non éligible » (fausse donnée d'éligibilité,
mauvaise statistique), soit laisser la demande en attente indéfiniment.

Par ailleurs, aucune des décisions d'éligibilité de l'AMO n'était tracée dans l'historique
`parcours_actions` : impossible de savoir, sur le détail dossier, qui a tranché et comment.

## Décision

> Nous ajoutons un troisième choix « éligible, mais ma structure ne va pas l'accompagner »
> qui pose le statut `ACCOMPAGNEMENT_REFUSE` **et archive** le parcours (raison saisie via la
> modale « Archiver » existante), dans une seule transaction, **sans routage automatique** vers
> l'aller-vers et **sans rendre le dossier éditable**.

Service `declineAccompagnementEligible` (`amo-validation.service.ts`) : `statut =
ACCOMPAGNEMENT_REFUSE` (+ `valideeAt`, token invalidé, `commentaire` = note optionnelle) et
`situation_particulier = archive` (`archived_at` / `archive_reason` / `archived_by`). L'action
`refuserAccompagnementEligible` (`demande-detail.actions.ts`) est gardée comme ses sœurs
(`assertNotSuperAdminReadOnly` + `verifyAmoOwnership`) et n'expose pas `parcoursId` au client.

En complément, les **trois** décisions d'éligibilité tracent une action système dans
`parcours_actions` (best-effort) : `eligibilite_acceptee`, `eligibilite_refusee_non_eligible`,
`accompagnement_refuse_eligible`. Les libellés des types système d'audit reçoivent un **emoji
préfixe** (cohérent avec les libellés du formulaire), rattrapé au passage pour les types d'arrêt
d'accompagnement (ADR-0018), la ré-ouverture et le renvoi d'invitation.

## Options envisagées

### Option A — `ACCOMPAGNEMENT_REFUSE` + archivage, sans routage, non éditable (retenue)

- Avantages : préserve l'information « éligible » (pas de faux « non éligible ») ; le dossier
  quitte proprement la file d'attente et bascule dans les Archivés (`archivedAt` prime dans
  `getDossierEtat`) ; réutilise la modale « Archiver » et le statut `ACCOMPAGNEMENT_REFUSE`
  déjà géré par la ré-ouverture (ADR-0016) ; **aucun fichier partagé** avec les surfaces
  d'édition de simulation (branche `archivage-auto`) donc aucun conflit de code.
- Inconvénients : le retour arrière est manuel (ré-ouverture ou dé-archivage) ; asymétrie
  « consultable mais non éditable » (le dossier archivé n'est pas corrigeable via « Vérifier
  son éligibilité »).

### Option B — Détacher l'AMO vers l'aller-vers (statut `sans_amo`), sans archivage

- Avantages : le parcours continue automatiquement, l'aller-vers du territoire reprend la main.
- Inconvénients : ne correspond pas au besoin exprimé (« archiver avec une raison ») ; pousse
  vers l'aller-vers un dossier que personne n'a peut-être sollicité ; mélange deux gestes
  distincts (refus d'accompagnement vs auto-attribution territoriale).

### Option C — Conserver `LOGEMENT_ELIGIBLE` et se contenter d'archiver

- Avantages : garde l'éligibilité explicitement attestée pour un futur repreneur.
- Inconvénients : statut trompeur (« éligible + suivi » alors que l'AMO ne suit pas) ; casse la
  sémantique du listing (dossier « suivi » archivé) ; incohérent avec la ré-ouverture qui
  s'appuie sur `accompagnement_refuse`.

## Conséquences

### Positives

- L'AMO dispose d'une réponse fidèle au réel ; les stats d'éligibilité ne sont plus polluées.
- Traçabilité complète : chaque décision d'éligibilité apparaît dans « Actions réalisées »
  avec une icône lisible.
- Réversibilité assurée par la ré-ouverture (ADR-0016), déjà compatible `accompagnement_refuse`.

### Négatives / Risques

- Asymétrie « consultable mais non éditable » sur `ACCOMPAGNEMENT_REFUSE` (`STATUTS_CONSULTABLES`
  l'inclut, `editableStatuts` non). Assumée : un dossier archivé pour ce motif est « garé ».
- La raison d'archivage ne doit jamais commencer par le préfixe « Non éligible » sous peine
  d'être happée par le dé-archivage automatique d'éligibilité (voir ADR-0020). Les
  `ARCHIVE_REASONS` de la modale sont sûres par construction.
- Emojis dans les libellés d'action, en tension avec « pas d'emojis dans le code » (CLAUDE.md),
  mais aligné sur le précédent existant (`ACTION_TYPE_GROUPS`) et sur la demande produit.

### Migration (si applicable)

Aucune migration de schéma : `ACCOMPAGNEMENT_REFUSE` existe déjà dans l'enum de validation, et
les nouveaux types `parcours_actions` sont du texte libre (`action_type`). Bump `1.37.3 → 1.38.0`.

## Liens

- Service : `src/features/parcours/amo/services/amo-validation.service.ts` (`declineAccompagnementEligible`)
- Action : `src/features/backoffice/espace-agent/demandes/actions/demande-detail.actions.ts` (`refuserAccompagnementEligible`)
- Types d'action : `src/features/backoffice/espace-agent/shared/domain/types/action.types.ts`
- UI : `src/app/(backoffice)/espace-agent/demandes/[id]/components/ReponseAccompagnement.tsx`, `ConfirmationReponseModal.tsx`
- Modale d'archivage réutilisée : `src/app/(backoffice)/espace-agent/shared/components/ArchiveModal.tsx`
- Documentation : `docs/parcours/FLOW-AND-SYNC.md` (§2.8), `docs/security/RBAC-ROLES.md`
- ADR liés : [ADR-0016](0016-reouverture-demande-refusee.md) (ré-ouverture), [ADR-0018](0018-arret-accompagnement-amo.md) (arrêt d'accompagnement), [ADR-0020](0020-correction-simulation-agent-post-eligibilite.md) (archivage/éligibilité)
