# ADR-0007 : Modèle d'état à deux niveaux du parcours et synchronisation DS par CRON

**Date** : 2026-05-06
**Statut** : Accepté

## Contexte

Le parcours d'un demandeur traverse 5 étapes (`choix_amo → eligibilite → diagnostic → devis → factures`), dont 4 reposent sur des dossiers Démarches Simplifiées ([ADR-0004](0004-demarches-simplifiees-backbone.md)). L'état d'avancement dépend de décisions prises **côté DS** (acceptation par l'agent), hors de notre application. Initialement, la progression nécessitait une action utilisateur (visite + clic) pour se propager : un parcours pouvait rester bloqué indéfiniment après acceptation DS si le demandeur ne se reconnectait pas.

## Décision

Nous adoptons un **modèle d'état à deux niveaux** et une **synchronisation automatique par CRON** :

1. **Deux niveaux d'état** :
   - `ds_status` (par dossier) — source de vérité = l'API DS.
   - `current_step` + `current_status` (`todo | en_instruction | valide`) — état interne du parcours, `current_status` étant **dérivé** du dossier de l'étape courante via `recomputeParcoursStatus`.
2. **Découplage sync / recompute** : `syncDossierStatus` ne met à jour que la table dossiers ; `recomputeParcoursStatus` recalcule l'état du parcours. Cela évite que la boucle de sync multi-dossiers laisse `current_status` non déterministe.
3. **Auto-progression par CRON GitHub Actions** : un workflow appelle 3×/jour un endpoint HTTP protégé par `CRON_SECRET` ; quand un parcours passe à `valide`, `moveToNextStep` avance l'étape (ou complète le parcours) automatiquement, sans intervention du demandeur.

> Nous séparons l'état DS de l'état interne dérivé, et faisons progresser les parcours automatiquement via un CRON externe plutôt qu'au gré des connexions utilisateur.

## Options envisagées

### Option A — Modèle deux niveaux + CRON GitHub Actions (retenue)

- Avantages : les parcours avancent dès l'acceptation DS sans action utilisateur ; `current_status` déterministe ; CRON indépendant de l'hébergeur, logs et déclenchement manuel natifs dans GitHub, testable au `curl`.
- Inconvénients : retard cron GitHub jusqu'à ~15 min ; dépendance à un service externe pour la progression ; historique de sync à purger à terme.

### Option B — Progression déclenchée uniquement par l'UI (état initial)

- Avantages : pas d'infra CRON.
- Inconvénients : parcours figés si le demandeur ne se reconnecte pas (le bug d'origine).

### Option C — Scalingo Scheduler ou worker dédié

- Avantages : meilleure précision de timing.
- Inconvénients : couplage à l'hébergeur (Scheduler) ou dyno supplémentaire (worker) ; visibilité moindre que GitHub Actions. Précision superflue pour 3 créneaux espacés.

## Conséquences

### Positives

- Verrou anti-runs concurrents + auto-expiration des runs zombie (self-healing).
- Historique des runs (`sync_runs` / `sync_run_entries`) consultable en super-admin.

### Négatives / Risques

- Pas de purge automatique de l'historique (dette connue).
- Latence d'acceptation DS → progression bornée par la cadence du CRON.

## Liens

- **Documentation détaillée et exhaustive** : [docs/parcours/FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md) (transitions, mapping, garde-fous, justifications §6).
- Service sync batch : `src/features/parcours/dossiers-ds/services/parcours-sync-batch.service.ts`
- Service sync DS : `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`
- Endpoint CRON : `src/app/api/cron/sync-parcours/route.ts`
- Workflow : `.github/workflows/cron-sync-parcours.yml`
- PR : #189
