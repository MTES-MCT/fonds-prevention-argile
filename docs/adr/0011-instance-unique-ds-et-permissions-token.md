# ADR-0011 : Instance unique Démarches Simplifiées (demarche.numerique.gouv.fr) et permissions du token par démarche

**Date** : 2026-06-12
**Statut** : Accepté

## Contexte

Démarches Simplifiées change de nom public : `demarche.numerique.gouv.fr` est le
**nouveau nom de `demarches-simplifiees.fr`** — c'est le **même service, le même
backend, la même base de dossiers**. Les nouvelles démarches sont créées sous le
domaine `demarche.numerique.gouv.fr`, mais elles cohabitent avec les anciennes sur
la même instance ; les numéros de démarche et de dossier sont communs.

Cette ambiguïté de nommage a un coût réel. Le code accède à DS via **trois URLs de
configuration indépendantes** (`src/shared/config/env.config.ts`) :

- `DEMARCHES_SIMPLIFIEES_REST_API_URL` — création des dossiers (préremplissage REST) ;
- `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL` — synchronisation des statuts (GraphQL) ;
- `NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL` — liens usager (« Reprendre »).

Si l'une diverge (un domaine sur `demarche.numerique.gouv.fr`, un autre sur
`demarches-simplifiees.fr`), on obtient des dossiers créés sur une instance,
introuvables en synchro sur l'autre, et des liens « Reprendre » en 404.

Par ailleurs, l'API GraphQL n'expose un dossier qu'aux **instructeurs/admins de sa
démarche**. Le token `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY` est lié à un compte
qui doit donc être instructeur de **chaque** démarche du parcours (éligibilité,
diagnostic, devis, factures). Sinon, `getDossier` reçoit un `unauthorized` et la
synchro échoue. Ce cas s'est réellement produit (juin 2026) : un dossier
d'éligibilité resté en `en_construction` n'était jamais retrouvé car le token
n'avait pas accès à la démarche d'éligibilité `146377` — l'erreur était de plus
avalée en `null`, produisant un faux « RAS » (corrigé, voir Liens).

Cet ADR complète [ADR-0004](0004-demarches-simplifiees-backbone.md) (DS comme
colonne vertébrale du parcours) et [ADR-0007](0007-modele-etat-parcours-sync-ds.md)
(modèle d'état et synchronisation).

## Décision

> Nous traitons `demarche.numerique.gouv.fr` et `demarches-simplifiees.fr` comme
> **une seule et même instance**. Les trois URLs de configuration DS pointent
> **toujours vers le même domaine**, et le compte derrière le token GraphQL doit
> être **instructeur/admin de chaque démarche** utilisée par le parcours.

Pour rendre cette contrainte vérifiable plutôt qu'implicite :

- un script ops (`scripts/ops/check-ds-permissions.ts`, npm `ds:check-permissions`)
  vérifie, pour le token courant, l'accès à chaque démarche configurée et sort en
  erreur si l'une est inaccessible ;
- la synchro **remonte et trace** désormais l'erreur GraphQL (entrée
  `sync_run_entries.error`) au lieu de l'avaler silencieusement.

## Options envisagées

### Option A — Instance unique + permissions vérifiées (retenue)

- Avantages : reflète la réalité (un seul backend) ; configuration simple (un seul
  domaine pour les 3 URLs) ; la contrainte de permissions devient testable
  (`ds:check-permissions`) et les pannes deviennent visibles (erreur tracée).
- Inconvénients : exige une discipline opérationnelle (ajouter le compte du token
  comme instructeur à chaque nouvelle démarche) — mitigée par le script.

### Option B — Supposer des instances séparées par environnement/domaine

- Avantages : aucun (modèle mental « staging vs prod = instances DS distinctes »).
- Inconvénients : faux — DS est un backend mutualisé ; conduirait à dupliquer la
  config et à des bugs d'URL/numéro. Rejetée.

### Option C — Détecter dynamiquement l'instance par démarche

- Avantages : tolérerait des domaines mixtes.
- Inconvénients : complexité inutile pour un backend unique ; masquerait des
  erreurs de configuration au lieu de les faire échouer tôt. Rejetée.

## Conséquences

### Positives

- Configuration DS sans ambiguïté : un domaine, trois URLs alignées.
- Contrainte de permissions explicite et vérifiable avant mise en service d'une
  démarche (`pnpm ds:check-permissions`).
- Fin des fausses « RAS » : une démarche inaccessible apparaît dans l'historique de
  synchronisation (`/administration/synchronisations`).

### Négatives / Risques

- À chaque nouvelle démarche (ou rotation de compte/token), penser à rattacher le
  compte du token comme instructeur — sinon synchro KO. Le script de vérification
  est le garde-fou ; à intégrer idéalement à une checklist de mise en service.

### Migration (si applicable)

1. Vérifier que les 3 variables d'env DS pointent vers le même domaine, par
   environnement (staging, production).
2. Lancer `pnpm ds:check-permissions` (local ou sur Scalingo) et rattacher au
   compte du token toute démarche en `unauthorized`.

## Liens

- Configuration : `src/shared/config/env.config.ts`
- Construction des URLs usager : `src/features/parcours/dossiers-ds/utils/ds-url.utils.ts`
- Adapter GraphQL (sync) : `src/features/parcours/dossiers-ds/adapters/graphql/client.ts`
- Service de synchronisation : `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`
- Script de vérification : `scripts/ops/check-ds-permissions.ts`
- Documentation : [docs/parcours/FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md), [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
- ADR liés : [ADR-0004](0004-demarches-simplifiees-backbone.md), [ADR-0007](0007-modele-etat-parcours-sync-ds.md)
