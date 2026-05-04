# Parcours et synchronisation DS

Document de référence sur le modèle d'état des parcours, leurs transitions et la synchronisation avec Démarches Simplifiées.

> Ce document est destiné à être inclus dans les prompts et lectures de contexte pour toute évolution touchant aux parcours, à la sync DS, à la progression d'étapes ou aux jobs CRON. Il documente aussi les choix architecturaux faits et leur justification.

---

## 1. Vue d'ensemble

### 1.1 Les 5 étapes

Un demandeur traverse 5 étapes en séquence :

```
choix_amo → eligibilite → diagnostic → devis → factures
```

Source de vérité : `src/shared/domain/value-objects/step.enum.ts`. Ordre canonique dans `STEP_ORDER` (`src/features/parcours/core/domain/value-objects/step.ts`).

### 1.2 Modèle d'état à deux niveaux

Chaque parcours a deux niveaux d'état complémentaires :

| Niveau            | Champ                                | Source de vérité                 |
| ----------------- | ------------------------------------ | -------------------------------- |
| Dossier DS        | `dossiers_demarches_simplifiees.ds_status` | API Démarches Simplifiées        |
| Parcours interne  | `parcours_prevention.current_status` | Dérivé du dossier de `current_step` |
| Parcours interne  | `parcours_prevention.current_step`   | Logique métier (progression)     |

- **`ds_status`** ∈ `EN_CONSTRUCTION | EN_INSTRUCTION | ACCEPTE | REFUSE | CLASSE_SANS_SUITE | NON_ACCESSIBLE` — c'est DS qui décide.
- **`current_status`** ∈ `todo | en_instruction | valide` — dérivé via `DS_TO_INTERNAL_STATUS` (voir §3.2).
- **`current_step`** ∈ les 5 étapes — change uniquement sur appel explicite à `moveToNextStep`.

### 1.3 Cycle de vie d'une étape

```
TODO ──(création dossier DS)──► EN_INSTRUCTION ──(sync DS, ds_status=accepte)──► VALIDE ──(moveToNextStep)──► étape N+1, TODO
```

- **TODO → EN_INSTRUCTION** : création du dossier DS (`creerDossier` action ou `createDiagnosticDossier` selon l'étape).
- **EN_INSTRUCTION → VALIDE** : la sync détecte que le dossier DS est passé à `ACCEPTE` côté DS, le mapping interne donne `VALIDE`, et `recomputeParcoursStatus` écrit `current_status = valide`.
- **VALIDE → étape suivante (TODO)** : appel à `moveToNextStep(userId)`.

---

## 2. Étapes et transitions

### 2.1 Tableau des transitions

| Transition                     | Mécanisme                                | Code |
|--------------------------------|------------------------------------------|------|
| Inscription → `choix_amo / todo` | À la création du parcours (`findOrCreateForUser`) | `parcours-prevention.repository.ts:206` |
| `choix_amo / todo` → `choix_amo / en_instruction` | Demandeur choisit un AMO | `selectAmoForUser`, `amo-selection.service.ts:266` |
| `choix_amo / en_instruction` → `eligibilite / todo` | **AMO valide** via lien email → `approveValidation` appelle `moveToNextStep` automatiquement | `amo-validation.service.ts:66` |
| `eligibilite / todo` → `eligibilite / en_instruction` | Demandeur soumet le formulaire DS éligibilité (`creerDossier`) | `parcours-dossier.actions.ts:54` |
| `eligibilite / en_instruction` → `eligibilite / valide` | Sync détecte `ds_status = accepte` + `recomputeParcoursStatus` | `ds-sync.service.ts` (voir §3) |
| `eligibilite / valide` → `diagnostic / todo` | **CRON** appelle `moveToNextStep` automatiquement après recompute | `parcours-sync-batch.service.ts` (voir §4) |
| `diagnostic / todo` → `diagnostic / en_instruction` | Demandeur clique « Transmettre les résultats » → `envoyerDossierDiagnostic` (préremplissage DS) | `diagnostic.service.ts:125` |
| `diagnostic / en_instruction` → `diagnostic / valide` | Idem éligibilité (sync + recompute) | id. |
| `diagnostic / valide` → `devis / todo` | Idem (CRON) | id. |
| `devis / *` → `factures / *` | Idem (cycle dépôt → sync → progression) | id. |
| `factures / valide` | État terminal. **`moveToNextStep` ne fait rien** car `isLastStep(factures)`. | `parcours-permissions.service.ts:26` |

### 2.2 Garde-fous existants

- **`canPassToNextStep(state)`** (`parcours-permissions.service.ts:26`) : `status === VALIDE && !isLastStep(step)`.
- **`canCreateDossier(state)`** : `status === TODO`.
- **`canValidateDossier(state)`** : `status === EN_INSTRUCTION`.
- `moveToNextStep` re-fetche l'état avant d'écrire → idempotent, safe en concurrence.
- `findActiveForSync()` exclut les parcours archivés et complétés du périmètre du CRON.

### 2.3 Cas particulier `choix_amo`

L'étape `choix_amo` **n'a pas de dossier DS**. La progression vers `eligibilite` est pilotée par la validation AMO via webhook email Brevo, pas par une sync DS. Conséquence pour le code de sync : `recomputeParcoursStatus` est no-op si `current_step = choix_amo` (pas de dossier de l'étape courante).

---

## 3. Architecture de la synchronisation

### 3.1 Trois fonctions à responsabilités séparées

Fichier : `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`.

```
syncDossierStatus(parcoursId, step, dsNumber)
    │
    ├── appelle l'API DS GraphQL (graphqlClient.getDossierStatus)
    ├── met à jour `dossiers_demarches_simplifiees.ds_status`
    └── NE TOUCHE PAS à `parcours.current_status`

recomputeParcoursStatus(parcoursId)
    │
    ├── lit `parcours.current_step`
    ├── lit le dossier de cette étape (si pas de dossier → no-op)
    ├── mappe `ds_status` → statut interne via `DS_TO_INTERNAL_STATUS`
    └── écrit `parcours.current_status` si différent

syncAllDossiers(parcoursId, dossiers)
    │
    ├── boucle `syncDossierStatus` sur chaque dossier
    └── appelle `recomputeParcoursStatus` une seule fois à la fin
```

**Règle d'usage** : tout appel à `syncDossierStatus` doit être suivi d'un `recomputeParcoursStatus` (manuel ou via `syncAllDossiers`). Sinon le parcours est désynchronisé.

### 3.2 Mapping DS → interne

Source : `src/features/parcours/dossiers-ds/domain/value-objects/ds-status.ts`.

| `ds_status`        | `current_status` (interne) |
|--------------------|----------------------------|
| `EN_CONSTRUCTION`  | `TODO`                     |
| `EN_INSTRUCTION`   | `EN_INSTRUCTION`           |
| `ACCEPTE`          | `VALIDE`                   |
| `REFUSE`           | `EN_INSTRUCTION`           |
| `CLASSE_SANS_SUITE`| `EN_INSTRUCTION`           |
| `NON_ACCESSIBLE`   | `TODO`                     |

Note : `REFUSE` repasse en `EN_INSTRUCTION` interne (et non `VALIDE`) — c'est volontaire, un dossier refusé n'avance pas l'étape.

### 3.3 Déclencheurs de sync

| Déclencheur | Service appelé | Périmètre |
|-------------|----------------|-----------|
| **CRON Scalingo Scheduler** (toutes les 15 min) | `runSyncBatch("cron")` | Tous les parcours actifs |
| **Super-admin** (bouton « Lancer maintenant ») | `runSyncBatch("manual")` | Idem CRON |
| **UI demandeur** (au refresh, manuel, ou navigation) | `syncUserDossierStatus(step)` ou `syncAllUserDossiers()` | Le parcours du demandeur connecté |

Tous appellent `recomputeParcoursStatus` après la phase de sync — soit en interne (`syncAllDossiers`, `runSyncBatch`), soit en explicite (`syncUserDossierStatus`).

---

## 4. CRON et historique

### 4.1 Périmètre du run

Service : `src/features/parcours/dossiers-ds/services/parcours-sync-batch.service.ts`.

`runSyncBatch(triggeredBy)` :

1. Crée une ligne `sync_runs` (status null = pending tant que `finished_at` est null).
2. Récupère tous les parcours actifs via `parcoursRepo.findActiveForSync()` (`archived_at IS NULL AND completed_at IS NULL`).
3. Pour chaque parcours, dans un `try/catch` indépendant :
   a. Lit l'état initial (`stepBefore`, `statusBefore`).
   b. Synchronise tous ses dossiers (`syncDossierStatus` × N) — collecte les `ds_status_changes`.
   c. Appelle `recomputeParcoursStatus` une fois.
   d. Si `current_status === VALIDE` ET `!isLastStep`, appelle `moveToNextStep`.
   e. Si quelque chose a changé (changement DS, status, étape, ou erreur), écrit une `sync_run_entries`.
   f. `sleep(150ms)` pour ne pas saturer l'API DS.
4. Finalise le run : `finished_at = NOW()`, totaux, status final (`success` / `partial` / `error` / pas d'erreur).

### 4.2 Tables d'historique

**`sync_runs`** — un enregistrement par run.

| Colonne                 | Type                                |
|-------------------------|-------------------------------------|
| `id`                    | uuid                                |
| `started_at`            | timestamp                           |
| `finished_at`           | timestamp (null = en cours)         |
| `status`                | `success | partial | error | null` |
| `triggered_by`          | `cron | manual`                     |
| `total_parcours_scanned`| int                                 |
| `total_parcours_updated`| int                                 |
| `total_errors`          | int                                 |
| `error_summary`         | text (20 premières erreurs concat)  |

**`sync_run_entries`** — une entrée par parcours **modifié** (ou en erreur) durant un run. Les parcours sans changement ne génèrent **pas** d'entrée pour ne pas alourdir la table.

| Colonne             | Type                                  |
|---------------------|---------------------------------------|
| `id`                | uuid                                  |
| `sync_run_id`       | FK → sync_runs (cascade)              |
| `parcours_id`       | FK → parcours_prevention (cascade)    |
| `step_before`       | step enum (nullable)                  |
| `step_after`        | step enum (nullable)                  |
| `status_before`     | status enum (nullable)                |
| `status_after`      | status enum (nullable)                |
| `ds_status_changes` | jsonb : `[{ step, oldDsStatus, newDsStatus }]` |
| `step_advanced`     | boolean                               |
| `error`             | text (nullable)                       |
| `created_at`        | timestamp                             |

### 4.3 Configuration Scalingo

Fichier `cron.json` à la racine, lu par l'addon Scheduler :

```json
{
  "jobs": [
    {
      "command": "curl -fsS -X POST -H \"Authorization: Bearer $CRON_SECRET\" $APP_URL/api/cron/sync-parcours",
      "size": "S",
      "cron": "*/15 * * * *"
    }
  ]
}
```

Variables d'environnement à configurer côté Scalingo :
- `CRON_SECRET` : secret aléatoire ≥ 32 caractères (validation Zod dans `env.config.ts`). Génération : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `APP_URL` : URL publique (ex : `https://fonds-argile.osc-fr1.scalingo.io`).

### 4.4 Endpoint HTTP

Route : `src/app/api/cron/sync-parcours/route.ts`.

- Method : `POST` uniquement.
- Auth : `Authorization: Bearer $CRON_SECRET`. Sinon 401.
- Réponse : `{ runId, status, totals: { scanned, updated, errors } }`.
- `maxDuration = 300` (5 min).

---

## 5. Vue super-admin

URL : `/administration/synchronisations` (réservée `SUPER_ADMINISTRATEUR`).

- **Liste** : table paginée des runs (date, durée, badge statut, trigger, totaux), bouton « Lancer une synchro maintenant ».
- **Détail** (`/administration/synchronisations/[id]`) : table des `sync_run_entries` avec demandeur, transitions step/status, changements DS, étape avancée, erreur.

Server actions : `src/features/backoffice/administration/synchronisations/actions/sync-runs.actions.ts`.

| Action                       | Rôle requis        | Effet                                    |
|------------------------------|--------------------|------------------------------------------|
| `listSyncRunsAction`         | SUPER_ADMINISTRATEUR | Liste paginée                            |
| `getSyncRunDetailAction`     | SUPER_ADMINISTRATEUR | Détail d'un run avec entries jointes     |
| `triggerManualSyncAction`    | SUPER_ADMINISTRATEUR | Lance `runSyncBatch("manual")`           |

---

## 6. Décisions architecturales et leur justification

### 6.1 Auto-progression dans le CRON (et non dans l'UI)

**Décision** : quand `current_status` devient `VALIDE` après recompute, le CRON appelle `moveToNextStep` automatiquement. Pas de bouton de confirmation côté demandeur.

**Justification** : avant le CRON, il fallait une action utilisateur (visite + clic) pour propager. Conséquence : si personne ne se connectait, le parcours restait figé indéfiniment, même après acceptation DS. Avec l'auto-progression CRON, le parcours avance dès que possible. C'était précisément le bug initial qui a déclenché ce chantier (parcours bloqué en `eligibilite/valide` après acceptation DS).

**Alternatives écartées** :
- Garder le bouton manuel : ajoute une étape inutile pour le demandeur, et résout pas le cas où il ne se connecte plus.
- Notification email + bouton : possible mais hors scope, la sync silencieuse fait le job.

### 6.2 Découplage `syncDossierStatus` / `recomputeParcoursStatus`

**Décision** : `syncDossierStatus` ne touche QUE la table dossiers. `recomputeParcoursStatus` est une fonction séparée qui recalcule le `current_status` à partir du dossier de `current_step`.

**Justification** : avant le refactor, `syncDossierStatus` mettait à jour `parcours.current_status` à chaque appel, sur la base du dossier passé en paramètre. Quand on syncait plusieurs dossiers en boucle (cas du CRON et de `syncAllUserDossiers`), le dernier dossier itéré écrasait les précédents → `current_status` non déterministe.

**Effet de bord positif** : `current_status` ne reflète plus que le dossier de l'étape courante. Les dossiers d'étapes passées restent en sync DS pour l'historique, mais ne polluent plus l'état du parcours.

**Effet de bord à connaître** : si un dossier d'étape passée a un revirement de statut DS (rare), il n'impacte plus `current_status`. C'est cohérent : l'étape est passée, on ne veut pas y revenir automatiquement.

### 6.3 Sync de tous les dossiers, pas seulement celui de current_step

**Décision** : le CRON appelle `syncDossierStatus` sur **tous** les dossiers du parcours, pas seulement celui de `current_step`.

**Justification** : la sync DS sert aussi de mécanisme de rattrapage. Un dossier d'étape passée peut avoir évolué côté DS sans qu'on l'ait capté à temps. On veut que l'historique en BDD reflète l'état DS courant. La séparation avec `recomputeParcoursStatus` (§6.2) garantit que ces syncs n'impactent pas l'état du parcours.

### 6.4 Pas de tables d'historique pour les parcours non-modifiés

**Décision** : `sync_run_entries` n'est écrit que si quelque chose a changé pour le parcours (changement DS, transition d'étape ou de status, ou erreur). Les parcours scannés sans changement ne génèrent pas d'entrée.

**Justification** : volume. Sur 10 000 parcours actifs syncés toutes les 15 min, on créerait ~1M entrées par jour pour rien. La table `sync_runs` (qui agrège les totaux) suffit pour le monitoring. Le détail n'est utile qu'en cas de changement.

### 6.5 Scalingo Scheduler + endpoint HTTP, pas de worker dédié

**Décision** : Scheduler Scalingo (cron natif) qui appelle un endpoint HTTP de Next.js, pas de process worker séparé.

**Justification** :
- Pas de dépendance ajoutée (`node-cron`, `agenda`, `bull`...).
- La logique reste dans Next.js, mêmes connexions DB, mêmes env vars.
- Pattern déjà utilisé pour le webhook Brevo (`/api/webhooks/brevo`).
- Testable manuellement avec un simple `curl`.

**Alternatives écartées** :
- `node-cron` dans le process Next.js : ne survit pas aux redémarrages, multiple instances → multiple runs simultanés.
- Process Procfile dédié : nécessite un dyno supplémentaire, complique le déploiement.

### 6.6 Auth par secret partagé sur l'endpoint CRON

**Décision** : `Authorization: Bearer $CRON_SECRET`, validé dans `env.config.ts` avec `min(32)`.

**Justification** : l'endpoint déclenche du travail backend coûteux (boucle sur tous les parcours, appels API DS). Sans auth, exposé à de l'abus. Pattern identique à `BREVO_WEBHOOK_SECRET`. Pas de données sensibles exfiltrables, mais protection contre déni de service / pollution de l'historique.

### 6.7 Sleep 150 ms entre parcours

**Décision** : `await sleep(150)` entre chaque parcours dans `runSyncBatch`.

**Justification** : l'API DS GraphQL n'a pas de rate limit documenté précisément, mais on évite de la marteler. À 150 ms × 10 000 parcours = 25 min, ce qui rentre dans le budget `maxDuration = 300s` côté endpoint si pas trop de parcours, et évite les pics de charge. À ajuster si la volumétrie grandit.

### 6.8 Non-décisions / dette technique connue

- **Pas de `markAsCompleted` automatique sur `factures/valide`** : le code actuel ne set jamais `completed_at`. Les parcours terminés restent dans `findActiveForSync` et sont rebalayés à chaque CRON pour rien. À traiter dans un chantier ultérieur.
- **Pas de verrou anti-runs concurrents** : si Scheduler et bouton manuel se croisent, deux `runSyncBatch` peuvent tourner en parallèle. Idempotent (pas de corruption) mais pollue l'historique. À traiter avec un check `pending run` avant `createRun`.
- **Pas de purge automatique de l'historique** : `sync_runs` et `sync_run_entries` grossissent indéfiniment. Prévoir un CRON de purge (>90 jours par exemple) en complément.

---

## 7. Fichiers clés

| Rôle | Fichier |
|------|---------|
| Schéma parcours | `src/shared/database/schema/parcours-prevention.ts` |
| Schéma dossiers DS | `src/shared/database/schema/dossiers-demarches-simplifiees.ts` |
| Schéma historique CRON | `src/shared/database/schema/sync-runs.ts`, `sync-run-entries.ts` |
| Repository parcours | `src/shared/database/repositories/parcours-prevention.repository.ts` |
| Repository sync_runs | `src/shared/database/repositories/sync-run.repository.ts` |
| Enums step / status | `src/shared/domain/value-objects/step.enum.ts`, `status.enum.ts`, `ds-status.enum.ts` |
| Mapping DS → interne | `src/features/parcours/dossiers-ds/domain/value-objects/ds-status.ts` |
| Permissions / garde-fous | `src/features/parcours/core/services/parcours-permissions.service.ts` |
| Progression d'étape | `src/features/parcours/core/services/parcours-progression.service.ts` |
| Service sync DS | `src/features/parcours/dossiers-ds/services/ds-sync.service.ts` |
| Service sync batch (CRON) | `src/features/parcours/dossiers-ds/services/parcours-sync-batch.service.ts` |
| Action UI sync | `src/features/parcours/dossiers-ds/actions/dossier-sync.actions.ts` |
| Validation AMO (auto-progression CHOIX_AMO) | `src/features/parcours/amo/services/amo-validation.service.ts` |
| Endpoint CRON | `src/app/api/cron/sync-parcours/route.ts` |
| Configuration Scheduler | `cron.json` (racine) |
| Server actions admin | `src/features/backoffice/administration/synchronisations/actions/sync-runs.actions.ts` |
| Page liste runs | `src/app/(backoffice)/administration/synchronisations/page.tsx` |
| Page détail run | `src/app/(backoffice)/administration/synchronisations/[id]/page.tsx` |
