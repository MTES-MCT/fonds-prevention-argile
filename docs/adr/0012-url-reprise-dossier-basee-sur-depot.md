# ADR-0012 : URL de reprise du dossier DS basée sur la date de dépôt (et non le statut)

**Date** : 2026-06-15
**Statut** : Accepté

## Contexte

Le bouton « Reprendre » d'un dossier DS pointait vers une URL choisie par
`buildDemarcheUrl` ([`ds-url.utils.ts`](../../src/features/parcours/dossiers-ds/utils/ds-url.utils.ts))
selon `ds_status` :

- `EN_CONSTRUCTION` → URL de **préremplissage** `/commencer/<uuid>?prefill_token=...` ;
- autres statuts → URL **stable** `/dossiers/<n>/demande`.

Bug remonté par la QA : après que l'usager a **déposé** son dossier, « Reprendre »
renvoyait une **404** (et le restait jusqu'à la prise en instruction par la DDT,
puis une synchro). Cause : le lien `/commencer?prefill_token` **ne fonctionne plus
une fois le dossier déposé**. Or côté DS, un dossier déposé reste `en_construction`
(jusqu'à `en_instruction`) — et DS renvoie aussi `en_construction` pour un **brouillon
non déposé**. Donc `ds_status` **ne distingue pas** « brouillon » de « déposé » : il
ne peut pas servir de signal pour choisir l'URL.

Le signal fiable existe depuis [ADR-0009](0009-semantique-statut-ds-depose-vs-brouillon.md) :
`submitted_at` (= `datePassageEnConstruction`, écrit par la sync) n'est renseigné
**qu'au dépôt réel**.

## Décision

> `buildDemarcheUrl` choisit l'URL selon le **dépôt** (`submitted_at`), pas selon
> `ds_status` :
>
> - **non déposé** (`submitted_at` absent) → URL **prefill** `/commencer` (nécessaire
>   pour réclamer/reprendre/déposer le brouillon) ;
> - **déposé** (`submitted_at` renseigné, ou statut déjà `en_instruction`/`accepte`/… )
>   → URL **stable** `/dossiers/<n>/demande`.

Les statuts `en_instruction`/`accepte`/`refuse`/`classe_sans_suite` sont aussi traités
« déposé » en filet de sécurité (données legacy dont `submitted_at` n'aurait pas été
capté).

## Options envisagées

### Option A — Clé sur `submitted_at` (retenue)

- Avantages : seul signal qui distingue réellement brouillon et déposé ; corrige le
  404 dès le dépôt, sans attendre l'instruction ni une synchro manuelle.
- Inconvénients : dépend de la persistance de `submitted_at` (ADR-0009).

### Option B — Garder la clé sur `ds_status`

- Inconvénients : `en_construction` est ambigu (brouillon ET déposé) → impossible de
  choisir correctement. C'est la cause du bug. Rejetée.

### Option C — Toujours servir l'URL stable

- Avantages : simple.
- Inconvénients : casse le **brouillon non encore réclamé** (l'URL stable refuse
  l'accès tant que l'usager n'a pas réclamé le dossier via le `prefill_token`). Rejetée.

## Conséquences

### Positives

- Le scénario QA est corrigé : créer → déposer → « Reprendre » ouvre le dossier déposé,
  sans 404, sans attendre l'instruction ni une synchro.

### Négatives / Risques

- Couplage à `submitted_at` : si la sync ne persiste pas la date de dépôt (régression
  ADR-0009), un dossier déposé retomberait sur l'URL prefill. Le filet `en_instruction+`
  limite l'impact.

## Liens

- Implémentation : `src/features/parcours/dossiers-ds/utils/ds-url.utils.ts`
- Câblage : `src/features/parcours/core/services/parcours-state.service.ts`
- Tests : `src/features/parcours/dossiers-ds/utils/ds-url.utils.test.ts`
- ADR lié : [ADR-0009](0009-semantique-statut-ds-depose-vs-brouillon.md) (sémantique du statut DS, `submitted_at`)
- Documentation : [docs/parcours/FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md)
