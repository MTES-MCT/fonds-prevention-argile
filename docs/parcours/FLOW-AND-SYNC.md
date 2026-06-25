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

| Niveau           | Champ                                      | Source de vérité                    |
| ---------------- | ------------------------------------------ | ----------------------------------- |
| Dossier DS       | `dossiers_demarches_simplifiees.ds_status` | API Démarches Simplifiées           |
| Parcours interne | `parcours_prevention.current_status`       | Dérivé du dossier de `current_step` |
| Parcours interne | `parcours_prevention.current_step`         | Logique métier (progression)        |

- **`ds_status`** ∈ `null | EN_CONSTRUCTION | EN_INSTRUCTION | ACCEPTE | REFUSE | CLASSE_SANS_SUITE | NON_ACCESSIBLE` — c'est DS qui décide. `null` = dossier créé dans DS mais **pas encore déposé** ; `EN_CONSTRUCTION` = **déposé**, en attente d'instruction (et non « brouillon »). Voir [ADR-0009](../adr/0009-semantique-statut-ds-depose-vs-brouillon.md).
- **`current_status`** ∈ `todo | en_instruction | valide` — dérivé via `DS_TO_INTERNAL_STATUS` (voir §3.2).
- **`current_step`** ∈ les 5 étapes — change uniquement sur appel explicite à `moveToNextStep`.

### 1.3 Cycle de vie d'une étape

```
TODO ──(dépôt usager, sync ds=en_construction)──► TODO* ──(sync ds=en_instruction)──► EN_INSTRUCTION ──(sync ds=accepte)──► VALIDE ──(moveToNextStep)──► étape N+1, TODO
   (* déposé, en attente de prise en instruction par la DDT)
```

- **Création du dossier** : `current_status` reste `TODO` — le dossier DS est créé mais pas encore déposé (`ds_status = null`). Voir [ADR-0009](../adr/0009-semantique-statut-ds-depose-vs-brouillon.md).
- **TODO → EN_INSTRUCTION** : la sync détecte `ds_status = en_instruction` (la DDT a pris le dossier en instruction) ; `recomputeParcoursStatus` écrit `current_status = en_instruction`. Le dépôt usager met `ds_status = en_construction`, qui mappe en interne sur `TODO` (§3.2) : le parcours reste `TODO` jusqu'à la prise en instruction.
- **EN_INSTRUCTION → VALIDE** : la sync détecte que le dossier DS est passé à `ACCEPTE` côté DS, le mapping interne donne `VALIDE`, et `recomputeParcoursStatus` écrit `current_status = valide`.
- **VALIDE → étape suivante (TODO)** : appel à `moveToNextStep(userId)`.

---

## 2. Étapes et transitions

### 2.1 Tableau des transitions

| Transition                                              | Mécanisme                                                                                                                                                                    | Code                                                                                                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Inscription → `choix_amo / todo`                        | À la création du parcours (`findOrCreateForUser`)                                                                                                                            | `parcours-prevention.repository.ts:206`                                                                                                       |
| `choix_amo / todo` → `choix_amo / en_instruction`       | Demandeur choisit un AMO                                                                                                                                                     | `selectAmoForUser`, `amo-selection.service.ts:266`                                                                                            |
| `choix_amo / en_instruction` → `eligibilite / todo`     | **AMO valide** via lien email → `approveValidation` appelle `moveToNextStep` automatiquement                                                                                 | `amo-validation.service.ts:66`                                                                                                                |
| `eligibilite / todo` → `eligibilite / en_instruction`   | Sync détecte `ds_status = en_instruction` (DDT prend la main) + `recomputeParcoursStatus`. La création du dossier (`createEligibiliteDossier`) garde `todo` (ADR-0009)       | `ds-sync.service.ts`, `eligibilite.service.ts`                                                                                                |
| `eligibilite / en_instruction` → `eligibilite / valide` | Sync détecte `ds_status = accepte` + `recomputeParcoursStatus`                                                                                                               | `ds-sync.service.ts` (voir §3)                                                                                                                |
| `eligibilite / valide` → `diagnostic / todo`            | **CRON ou sync UI demandeur** appelle `moveToNextStep` automatiquement après recompute                                                                                       | `parcours-sync-batch.service.ts` (§4), `dossier-sync.actions.ts` (§6.1)                                                                       |
| `diagnostic / todo` → `diagnostic / en_instruction`     | Sync détecte `ds_status = en_instruction` (DDT prend la main) + recompute. La création (`envoyerDossierDiagnostic`) garde `todo` (ADR-0009)                                  | `ds-sync.service.ts`, `diagnostic.service.ts`                                                                                                 |
| `diagnostic / en_instruction` → `diagnostic / valide`   | Idem éligibilité (sync + recompute)                                                                                                                                          | id.                                                                                                                                           |
| `diagnostic / valide` → `devis / todo`                  | Idem (CRON ou sync UI)                                                                                                                                                       | id.                                                                                                                                           |
| `devis / *` → `devis / valide`                          | Idem (cycle dépôt → sync → recompute)                                                                                                                                        | id.                                                                                                                                           |
| `devis / valide` → `factures / todo`                    | Idem (CRON ou sync UI)                                                                                                                                                       | id.                                                                                                                                           |
| `factures / *` → `factures / valide`                    | Sync DS (factures.ds_status = accepte) + recompute                                                                                                                           | id.                                                                                                                                           |
| `factures / valide`                                     | **État terminal**. `moveToNextStep` détecte `isParcoursComplete` et appelle `markAsCompleted` (set `completed_at`). Le parcours sort de `findActiveForSync` au prochain run. | `parcours-progression.service.ts` (branche `isParcoursComplete`), `parcours-prevention.repository.ts` (méthode `markAsCompleted` idempotente) |

### 2.2 Garde-fous existants

- **`canPassToNextStep(state)`** (`parcours-permissions.service.ts:26`) : `status === VALIDE && !isLastStep(step)`.
- **`canCreateDossier(state)`** : `status === TODO`. Ne sert plus de verrou anti-doublon — la création de dossier est idempotente (`getDossierByStep`), cf. [ADR-0009](../adr/0009-semantique-statut-ds-depose-vs-brouillon.md).
- **`canValidateDossier(state)`** : `status === EN_INSTRUCTION` — donc possible uniquement quand la DDT instruit réellement (le dossier seulement déposé reste `TODO`).
- `moveToNextStep` re-fetche l'état avant d'écrire → idempotent, safe en concurrence.
- `findActiveForSync()` exclut les parcours archivés et complétés du périmètre du CRON.

### 2.3 Cas particulier `choix_amo`

L'étape `choix_amo` **n'a pas de dossier DS**. La progression vers `eligibilite` est pilotée par la validation AMO via webhook email Brevo, pas par une sync DS. Conséquence pour le code de sync : `recomputeParcoursStatus` est no-op si `current_step = choix_amo` (pas de dossier de l'étape courante).

### 2.4 Ré-ouverture d'une demande refusée (changement d'avis)

Une demande refusée par l'AMO (`parcours_amo_validations.statut = logement_non_eligible`,
parfois `accompagnement_refuse`) fige le parcours en `choix_amo / todo` ; le dossier
apparaît dans les **archives** de l'AMO (état `REFUSE`, ce n'est pas un archivage
`archived_at`). Quand le demandeur « se réveille », on **ré-ouvre** : transition inverse
`refusé → en_attente` AMO.

Service unique `reouvrirDemandeRefusee` (`reouverture-demande.service.ts`), partagé par
le script ops `pnpm fix:reouvrir-demande` et la server action UI `reouvrirDemandeAction`
(bouton « Ré-ouvrir la demande » sur le détail dossier). Effet : `validation -> en_attente`
(reset `valideeAt`/commentaire/tracking), `parcours -> prospect` / `archived_* = null` /
`current_status = en_instruction`, **nouveau token** (90 j) et email AMO optionnel.
Permissions et audit : voir [ADR-0016](../adr/0016-reouverture-demande-refusee.md) et
[RBAC-ROLES.md](../security/RBAC-ROLES.md).

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

| `ds_status`         | `current_status` (interne) |
| ------------------- | -------------------------- |
| `EN_CONSTRUCTION`   | `TODO`                     |
| `EN_INSTRUCTION`    | `EN_INSTRUCTION`           |
| `ACCEPTE`           | `VALIDE`                   |
| `REFUSE`            | `EN_INSTRUCTION`           |
| `CLASSE_SANS_SUITE` | `EN_INSTRUCTION`           |
| `NON_ACCESSIBLE`    | `TODO`                     |

Note : `REFUSE` repasse en `EN_INSTRUCTION` interne (et non `VALIDE`) — c'est volontaire, un dossier refusé n'avance pas l'étape.

Note : un `ds_status = null` (dossier créé non déposé) n'a pas d'entrée de mapping — `recomputeParcoursStatus` l'ignore et laisse `current_status` inchangé. `EN_CONSTRUCTION` (déposé) reste mappé en `TODO` interne : un dépôt en attente d'instruction n'avance pas encore l'étape côté parcours. Les dates `submitted_at` (passage en construction = dépôt) et `instructed_at` (passage en instruction) sont écrites par la sync via le mapper de colonne Drizzle (`Date` typée — ne jamais interpoler un `Date` dans un `sql` brut, cela fait planter l'UPDATE). Voir [ADR-0009](../adr/0009-semantique-statut-ds-depose-vs-brouillon.md).

### 3.3 Déclencheurs de sync

| Déclencheur                                                         | Service appelé                                           | Périmètre                         |
| ------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------- |
| **CRON GitHub Actions** (3 fois par jour : 06:15, 13:15, 16:15 UTC) | `runSyncBatch("cron")`                                   | Tous les parcours actifs          |
| **Super-admin** (bouton « Lancer maintenant »)                      | `runSyncBatch("manual")`                                 | Idem CRON                         |
| **UI demandeur** (au refresh, manuel, ou navigation)                | `syncUserDossierStatus(step)` ou `syncAllUserDossiers()` | Le parcours du demandeur connecté |

Tous appellent `recomputeParcoursStatus` après la phase de sync — soit en interne (`syncAllDossiers`, `runSyncBatch`), soit en explicite (`syncUserDossierStatus`). Tous appellent ensuite `moveToNextStep` : le CRON (et le manuel) dans `runSyncBatch`, l'UI demandeur dans `syncUserDossierStatus` / `syncAllUserDossiers`. `moveToNextStep` est idempotent et no-op si l'étape courante n'est pas `valide` (voir §6.1).

---

## 4. CRON et historique

### 4.1 Périmètre du run

Service : `src/features/parcours/dossiers-ds/services/parcours-sync-batch.service.ts`.

`runSyncBatch(triggeredBy)` :

1. **Verrou** : check `findPendingRun()`. Si run en cours < 30 min → return `{ skipped: true }`. Si zombie ≥ 30 min → finalise en `ERROR` puis continue. Voir §6.7.
2. Crée une ligne `sync_runs` (status null = pending tant que `finished_at` est null).
3. Récupère tous les parcours actifs via `parcoursRepo.findActiveForSync()` (`archived_at IS NULL AND completed_at IS NULL`).
4. Pour chaque parcours, dans un `try/catch` indépendant :
   a. Lit l'état initial (`stepBefore`, `statusBefore`).
   b. Synchronise tous ses dossiers (`syncDossierStatus` × N) — collecte les `ds_status_changes`.
   c. Appelle `recomputeParcoursStatus` une fois.
   d. Si `current_status === VALIDE`, appelle `moveToNextStep` qui :
   - avance à l'étape suivante si non finale ;
   - sinon (étape `factures`) appelle `markAsCompleted` (set `completed_at`).
     e. Si quelque chose a changé (changement DS, status, étape, ou erreur), écrit une `sync_run_entries`.
     f. `sleep(150ms)` pour ne pas saturer l'API DS.
5. Finalise le run : `finished_at = NOW()`, totaux, status final (`success` / `partial` / `error` / pas d'erreur).

### 4.2 Tables d'historique

**`sync_runs`** — un enregistrement par run.

| Colonne                  | Type                               |
| ------------------------ | ---------------------------------- | ------- | ----- | ----- |
| `id`                     | uuid                               |
| `started_at`             | timestamp                          |
| `finished_at`            | timestamp (null = en cours)        |
| `status`                 | `success                           | partial | error | null` |
| `triggered_by`           | `cron                              | manual` |
| `total_parcours_scanned` | int                                |
| `total_parcours_updated` | int                                |
| `total_errors`           | int                                |
| `error_summary`          | text (20 premières erreurs concat) |

**`sync_run_entries`** — une entrée par parcours **modifié** (ou en erreur) durant un run. Les parcours sans changement ne génèrent **pas** d'entrée pour ne pas alourdir la table.

| Colonne             | Type                                           |
| ------------------- | ---------------------------------------------- |
| `id`                | uuid                                           |
| `sync_run_id`       | FK → sync_runs (cascade)                       |
| `parcours_id`       | FK → parcours_prevention (cascade)             |
| `step_before`       | step enum (nullable)                           |
| `step_after`        | step enum (nullable)                           |
| `status_before`     | status enum (nullable)                         |
| `status_after`      | status enum (nullable)                         |
| `ds_status_changes` | jsonb : `[{ step, oldDsStatus, newDsStatus }]` |
| `step_advanced`     | boolean                                        |
| `error`             | text (nullable)                                |
| `created_at`        | timestamp                                      |

### 4.3 Configuration GitHub Actions

Workflow : [`.github/workflows/cron-sync-parcours.yml`](../../.github/workflows/cron-sync-parcours.yml).

**Cadence** : 3 créneaux par jour, en UTC :

| Cron UTC      | Heure FR hiver | Heure FR été | Intention      |
| ------------- | -------------- | ------------ | -------------- |
| `15 6 * * *`  | 07:15          | 08:15        | tôt le matin   |
| `15 13 * * *` | 14:15          | 15:15        | après déjeuner |
| `15 16 * * *` | 17:15          | 18:15        | fin de journée |

GitHub Actions cron est en **UTC sans support timezone**, donc les heures locales FR dérivent de ±1 h selon le passage été/hiver. Les heures UTC ont été choisies pour rester dans des fenêtres acceptables toute l'année. Décalage de 15 min après l'heure pile pour éviter les pics de charge GitHub Actions.

**Stratégie matrix** : un seul workflow lance deux jobs en parallèle (`staging` et `production`) via `strategy.matrix.environment`. `fail-fast: false` → un échec sur staging n'empêche pas prod (et inversement).

**GitHub Environments** : la séparation des secrets entre staging et prod se fait via **GitHub Environments**. Setup côté GitHub (admin du repo) :

1. Settings → Environments → créer `staging` et `production`.
2. Pour chaque environment :
   - **Secret** `CRON_SECRET` (≥ 32 caractères, identique côté Scalingo).
   - **Variable** `APP_URL` (URL publique de l'app correspondante).
3. Le workflow référence `${{ secrets.CRON_SECRET }}` et `${{ vars.APP_URL }}` qui se résolvent automatiquement selon `environment: ${{ matrix.environment }}`.

**Côté Scalingo (chaque app)** : ajouter la variable d'env `CRON_SECRET` (validée par Zod dans `env.config.ts`, ≥ 32 caractères). Pas besoin d'`APP_URL` côté Scalingo — c'est le destinataire du curl, configuré côté GitHub uniquement.

**Déclenchement manuel** : Actions → CRON sync parcours → "Run workflow". Lance les deux environments par défaut. Pour ne lancer qu'un seul, utiliser le bouton « Lancer une synchro maintenant » dans `/administration/synchronisations` côté app correspondante.

**Concurrence** : `concurrency.cancel-in-progress: false` → si un run est déjà en cours, le suivant attend. De toute façon le verrou applicatif (§6.8) renvoie `{ skipped: true }` côté serveur si nécessaire.

**Pourquoi 3 créneaux fixes plutôt qu'une cadence régulière ?** On vise les moments où le demandeur est susceptible d'utiliser l'app (matin, après déjeuner, fin de journée). Trois passages couvrent ces fenêtres sans surcharger l'API DS. Le bouton « Lancer maintenant » côté super-admin reste disponible pour les cas urgents.

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

| Action                    | Rôle requis          | Effet                                |
| ------------------------- | -------------------- | ------------------------------------ |
| `listSyncRunsAction`      | SUPER_ADMINISTRATEUR | Liste paginée                        |
| `getSyncRunDetailAction`  | SUPER_ADMINISTRATEUR | Détail d'un run avec entries jointes |
| `triggerManualSyncAction` | SUPER_ADMINISTRATEUR | Lance `runSyncBatch("manual")`       |

---

## 6. Décisions architecturales et leur justification

### 6.1 Auto-progression automatique (CRON + sync UI demandeur)

**Décision** : quand `current_status` devient `VALIDE` après recompute, on appelle `moveToNextStep` automatiquement, **dans le CRON comme dans la sync UI demandeur** (`syncUserDossierStatus` / `syncAllUserDossiers`). Pas de bouton de confirmation côté demandeur. `moveToNextStep` est idempotent et no-op (aucune écriture) si l'étape courante n'est pas `valide`, donc l'appeler systématiquement après recompute est sans risque.

**Justification** : à l'origine, il fallait une action utilisateur (visite + clic) pour propager ; si personne ne se connectait, le parcours restait figé indéfiniment, même après acceptation DS. Le CRON a résolu ce cas. Mais tant que la sync UI ne faisait que `recomputeParcoursStatus` (sans `moveToNextStep`), un demandeur **connecté** qui voyait son éligibilité acceptée restait coincé sur `eligibilite/valide` jusqu'au prochain run CRON (jusqu'à plusieurs heures), au lieu de passer immédiatement à `diagnostic/todo`. C'était le symptôme QA (« validé mais pas passé à l'étape suivante »). En appelant `moveToNextStep` aussi côté UI, le parcours avance dès que le demandeur rafraîchit/navigue, et le CRON reste le filet pour les parcours dont personne ne se connecte.

**Alternatives écartées** :

- Garder le bouton manuel : ajoute une étape inutile pour le demandeur, et ne résout pas le cas où il ne se connecte plus.
- Notification email + bouton : possible mais hors scope, la sync silencieuse fait le job.
- Laisser la progression au seul CRON : laisse un demandeur connecté attendre le prochain run sans raison (symptôme QA ci-dessus).

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

**Justification** : volume. Avec un CRON 3×/jour sur N parcours actifs, on évite N×3 entrées par jour vides. La table `sync_runs` (qui agrège les totaux) suffit pour le monitoring. Le détail n'est utile qu'en cas de changement.

### 6.5 GitHub Actions + endpoint HTTP, pas de worker dédié

**Décision** : workflow GitHub Actions (cron natif) qui appelle un endpoint HTTP de Next.js, pas de process worker côté Scalingo. Cadence : 3 fois par jour à des créneaux choisis (matin, après déjeuner, fin de journée). Voir §4.3.

**Justification** :

- Pas de dépendance Scalingo ajoutée (pas d'addon Scheduler à activer).
- Logs natifs visibles dans l'UI GitHub (Actions → CRON sync parcours), notifications email natives sur échec.
- "Run workflow" manuel disponible depuis l'UI GitHub.
- Pattern indépendant de l'hébergeur : si on quitte Scalingo, le CRON suit.
- La logique applicative reste dans Next.js, mêmes connexions DB, mêmes env vars.
- Testable manuellement avec un simple `curl`.

**Alternatives écartées** :

- **Scalingo Scheduler** : valable, donne une meilleure précision de timing (cron Linux standard vs jusqu'à 15 min de retard côté GitHub Actions). Écarté car avec 3 créneaux espacés de plusieurs heures, un retard de quelques minutes est sans effet, et la visibilité GitHub est préférée.
- `node-cron` dans le process Next.js : ne survit pas aux redémarrages, multiple instances → multiple runs simultanés.
- Process Procfile dédié : nécessite un dyno supplémentaire, complique le déploiement.

**Trade-off cadence / précision** :

- GitHub Actions cron a un retard documenté pouvant aller jusqu'à 15 min (parfois plus en heures de pointe). Sur une cadence courte (15 min) ça devient problématique. Sur 3 créneaux espacés de plusieurs heures, c'est négligeable.
- Si la latence d'acceptation DS → progression devient un point de douleur produit, soit on augmente la cadence (`*/4 * * *` = 4 h), soit on rebascule sur Scalingo Scheduler.

**Multi-environnements** : le workflow utilise une **strategy matrix [staging, production]** sur les **GitHub Environments** pour scoper les secrets (`CRON_SECRET`, `APP_URL`) par env. Voir §4.3.

### 6.6 Auth par secret partagé sur l'endpoint CRON

**Décision** : `Authorization: Bearer $CRON_SECRET`, validé dans `env.config.ts` avec `min(32)`.

**Justification** : l'endpoint déclenche du travail backend coûteux (boucle sur tous les parcours, appels API DS). Sans auth, exposé à de l'abus. Pattern identique à `BREVO_WEBHOOK_SECRET`. Pas de données sensibles exfiltrables, mais protection contre déni de service / pollution de l'historique.

### 6.7 Complétion automatique sur `factures/valide`

**Décision** : `moveToNextStep` détecte `isParcoursComplete(state)` (= `step === FACTURES && status === VALIDE`) et appelle `parcoursRepo.markAsCompleted(id)` qui set `completed_at`. Le CRON appelle systématiquement `moveToNextStep` quand `current_status === VALIDE`, peu importe l'étape.

Côté repository, `markAsCompleted` est **idempotent** : le SQL est `UPDATE ... WHERE completed_at IS NULL`, donc un appel sur un parcours déjà complété est un no-op (le timestamp d'origine est préservé).

**Justification** : sans ça, les parcours arrivés à `factures/valide` restaient indéfiniment dans `findActiveForSync()` (qui filtre `completed_at IS NULL`). Le CRON balayait ces parcours à chaque run pour rien (appels DS inutiles, entries potentiellement dupliquées si le statut DS bougeait encore). Avec `markAsCompleted`, ils sortent du périmètre dès le run qui les fait passer à `valide`.

**Effet sur l'historique** : la `sync_run_entries` du run qui complète le parcours montre `stepBefore = stepAfter = factures`, `statusBefore = en_instruction`, `statusAfter = valide`, `step_advanced = false`. La complétion n'a pas de flag explicite — elle se déduit du `stepAfter = factures` + `statusAfter = valide`. Suffisant pour le MVP, on pourra ajouter un champ `parcours_completed: bool` plus tard si nécessaire.

### 6.8 Verrou anti-runs concurrents

**Décision** : avant de créer un nouveau run, `runSyncBatch` vérifie qu'aucun run n'est en cours (`findPendingRun()` = ligne `sync_runs` sans `finished_at`).

- Si un run est en cours **et** démarré il y a < 30 min → on **skip** : le résultat retourné est `{ skipped: true, reason, existingRunId }`. L'endpoint et l'UI affichent un message « run déjà en cours ».
- Si un run est en cours **et** démarré il y a ≥ 30 min → considéré comme **zombie** : on le finalise en `ERROR` avec `errorSummary = "Run zombie auto-expiré..."`, puis on lance un nouveau run normalement. Le système est ainsi self-healing après crash / timeout.

Le seuil de 30 min est volontairement généreux par rapport au `maxDuration = 5 min` de la route HTTP CRON. Constante : `STALE_RUN_THRESHOLD_MS` dans `parcours-sync-batch.service.ts`.

**Justification** : un super-admin peut cliquer « Lancer maintenant » pendant qu'un run scheduled tourne (ou inversement) → deux `runSyncBatch` parallèles écriraient des entries dupliquées et doubleraient les appels DS. Le verrou est implémenté en applicatif (pas un advisory lock Postgres) car il suffit largement pour la fréquence et la volumétrie attendues.

**Type retourné** : `SyncRunResult` est un union discriminé :

```ts
type SyncRunResult =
  | { skipped: false; runId; status; totalScanned; totalUpdated; totalErrors }
  | { skipped: true; reason; existingRunId };
```

### 6.9 Sleep 150 ms entre parcours

**Décision** : `await sleep(150)` entre chaque parcours dans `runSyncBatch`.

**Justification** : l'API DS GraphQL n'a pas de rate limit documenté précisément, mais on évite de la marteler. À 150 ms × 10 000 parcours = 25 min, ce qui rentre dans le budget `maxDuration = 300s` côté endpoint si pas trop de parcours, et évite les pics de charge. À ajuster si la volumétrie grandit.

### 6.10 Non-décisions / dette technique connue

- **Pas de purge automatique de l'historique** : `sync_runs` et `sync_run_entries` grossissent indéfiniment. Prévoir un CRON de purge (>90 jours par exemple) en complément.
- **Pas de flag explicite « parcours complété » dans `sync_run_entries`** : la complétion se déduit de `stepAfter = factures && statusAfter = valide`. À ajouter si on veut filtrer/agréger sur ce critère dans la vue admin.

---

## 7. Prérequis et pièges DS (préremplissage, publication, permissions)

Diagnostiqués en juin 2026 sur des parcours bloqués en éligibilité. Comportements DS à
connaître et prérequis opérationnels — à vérifier avant (ou en plus) de soupçonner le
code.

### 7.1 Le lien de préremplissage : réutilisable pour un brouillon, mort après dépôt

L'URL `ds_url` (`/commencer/<uuid>?prefill_token=...`) est **réutilisable tant que le
dossier est un brouillon non déposé** : DS affiche « Vous avez un dossier prérempli →
Poursuivre ». Le `prefill_token` n'est pas à usage unique. **Mais une fois le dossier
DÉPOSÉ, ce lien ne pointe plus vers le dossier → 404** (bug QA de juin 2026).

Comme DS renvoie `ds_status = en_construction` aussi bien pour un brouillon que pour un
dossier déposé en attente d'instruction, le statut **ne suffit pas** à choisir l'URL de
reprise. `buildDemarcheUrl` (`ds-url.utils.ts`) bascule donc sur le signal **`submitted_at`**
(date de dépôt) : brouillon (`submitted_at` absent) → lien prefill ; déposé → URL stable
`/dossiers/<n>/demande`. Voir [ADR-0012](../adr/0012-url-reprise-dossier-basee-sur-depot.md).

### 7.2 Une démarche non publiée (brouillon/test) bloque le dépôt

Une démarche en état `brouillon` (GraphQL `demarche.state`) affiche côté usager
« Démarche en test, réservée à l'administration… pour déposer, obtenez le lien
public ». Le demandeur peut **ouvrir/poursuivre** son brouillon mais **ne peut pas
déposer** → le dossier reste `en_construction` → le parcours ne progresse jamais
(symptôme : « validé mais jamais retrouvé / bloqué à l'étape »). Prérequis : la
démarche doit être **publiée**. Détection : `pnpm ds:check-permissions` affiche
`[non publiée]` pour ces démarches.

### 7.3 Le token doit être instructeur de chaque démarche

Cf. [ADR-0011](../adr/0011-instance-unique-ds-et-permissions-token.md). Si le token
GraphQL n'est pas instructeur d'une démarche, `getDossier` reçoit `unauthorized` →
la sync de cette étape échoue. Depuis juin 2026 cette erreur est **tracée**
(`sync_run_entries.error`) au lieu d'être avalée en faux « RAS » (voir §3.1).
Détection préventive : `pnpm ds:check-permissions` (statut `UNAUTHORIZED`).

### 7.4 Remédiation : reset d'un dossier d'éligibilité non synchronisable

> Guide simplifié dédié (cas, sous-cas, scripts, playbook) :
> [SYNC-ERREURS-ET-REMEDIATION.md](SYNC-ERREURS-ET-REMEDIATION.md).

Quand le lien DS n'a jamais été fait correctement (token non instructeur, démarche non
publiée, dossier introuvable), le dossier d'éligibilité est « fantôme » : jamais
déposable, jamais synchronisable. Le parcours reste bloqué en `eligibilite/todo` et
apparaît en **SYNC EN ERREUR** sur `administration/diagnostics` (cf. §7.2/7.3).

Remédiation : **supprimer la ligne `dossiers_demarches_simplifiees` de l'étape
éligibilité**, en laissant le parcours en `eligibilite/todo` (état « l'AMO vient de
valider »). Côté espace demandeur, `getDossierByStep` renvoie alors `null` → le CTA
« Remplir le formulaire d'éligibilité » réapparaît et `createEligibiliteDossier`
génère un **nouveau lien prefill** (« commencer »), et non « reprendre » le dossier
cassé (cf. `buildDemarcheUrl`, bascule sur `submitted_at`, §7.1). La validation AMO
(`LOGEMENT_ELIGIBLE`) n'est pas touchée.

Script : `pnpm fix:eligibilite-sync-error` (dry-run par défaut, `--apply` pour
exécuter, `--parcours-id=<uuid>` pour cibler). **Auto-vérifiant côté DN** : avant toute
suppression, le script interroge DN (lecture seule) pour chaque candidat et ne supprime
**que** les dossiers confirmés disparus. La validation AMO et l'historique
`sync_run_entries` sont **conservés**. Verdicts :

- **GONE** (DN « Dossier not found » ou dossier inexistant) → pointeur mort → **reset**
  (suppression → nouveau lien « commencer »).
- **EXISTS** (le dossier existe encore côté DN : en construction / en instruction / traité)
  → **jamais supprimé** (vraie donnée) ; la prochaine sync réussie rattrapera le parcours.
- **PROBE_ERREUR** (erreur DN ≠ « not found », ex. unauthorized) → laissé (incertitude).
- **SANS_DOSSIER** (pas de dossier local) → rien à faire.

Pourquoi la vérification DN et pas l'heuristique `submitted_at` : un `submitted_at`
renseigné ne garantit pas que le dossier existe encore (DN **purge les dossiers en
construction jamais transmis** → « Dossier not found » sur un dossier pourtant déposé).
Seul l'appel DN distingue un pointeur mort d'un vrai dossier vivant en instruction.

Sonde DN autonome (même cross-check, sans rien supprimer) :
`pnpm ds:probe-dossiers --from-sync-errors` (ou `--numbers=…`) — classe la réponse réelle
de DN (`SUPPRIME_OU_INTROUVABLE`, `DEPOSE_NON_INSTRUIT`, `EN_INSTRUCTION`, `TRAITE`,
`INEXISTANT`). Utile pour auditer avant le reset.

Le diagnostic distingue deux états de sync-erreur (détection en base, sans appel DN) :
**« Sync erreur (déposé non instruit) »** (`SYNC_ERREUR_DEPOSE` — `submitted_at` + pas
d'`instructed_at`, piste expiration DN) et **« Sync erreur (autre) »** (`SYNC_ERREUR`).

> Erreur obsolète auto-résolue : le diagnostic ne compte une `sync_run_entries.error`
> que si elle concerne encore le dossier courant (dossier présent, erreur postérieure à
> sa création, aucune sync réussie depuis). Après reset (dossier supprimé) ou resync
> réussie, le parcours **quitte** l'état sync-erreur au prochain chargement. L'historique
> `sync_run_entries` reste conservé.

---

## 8. Fichiers clés

| Rôle                                        | Fichier                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Schéma parcours                             | `src/shared/database/schema/parcours-prevention.ts`                                            |
| Schéma dossiers DS                          | `src/shared/database/schema/dossiers-demarches-simplifiees.ts`                                 |
| Schéma historique CRON                      | `src/shared/database/schema/sync-runs.ts`, `sync-run-entries.ts`                               |
| Repository parcours                         | `src/shared/database/repositories/parcours-prevention.repository.ts`                           |
| Repository sync_runs                        | `src/shared/database/repositories/sync-run.repository.ts`                                      |
| Enums step / status                         | `src/shared/domain/value-objects/step.enum.ts`, `status.enum.ts`, `ds-status.enum.ts`          |
| Mapping DS → interne                        | `src/features/parcours/dossiers-ds/domain/value-objects/ds-status.ts`                          |
| Permissions / garde-fous                    | `src/features/parcours/core/services/parcours-permissions.service.ts`                          |
| Progression d'étape                         | `src/features/parcours/core/services/parcours-progression.service.ts`                          |
| Service sync DS                             | `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`                                |
| Service sync batch (CRON)                   | `src/features/parcours/dossiers-ds/services/parcours-sync-batch.service.ts`                    |
| Vérif permissions / état démarches DS       | `scripts/ops/ds/check-ds-permissions.ts` (`pnpm ds:check-permissions`)                         |
| Reset dossier éligibilité sync-erreur       | `scripts/ops/sync-erreurs/reset-eligibilite-sync-error.ts` (`pnpm fix:eligibilite-sync-error`) |
| Sonde lecture-seule dossiers DN             | `scripts/ops/sync-erreurs/probe-dossiers.ts` (`pnpm ds:probe-dossiers`)                        |
| Action UI sync                              | `src/features/parcours/dossiers-ds/actions/dossier-sync.actions.ts`                            |
| Validation AMO (auto-progression CHOIX_AMO) | `src/features/parcours/amo/services/amo-validation.service.ts`                                 |
| Endpoint CRON                               | `src/app/api/cron/sync-parcours/route.ts`                                                      |
| Workflow CRON GitHub Actions                | `.github/workflows/cron-sync-parcours.yml`                                                     |
| Server actions admin                        | `src/features/backoffice/administration/synchronisations/actions/sync-runs.actions.ts`         |
| Page liste runs                             | `src/app/(backoffice)/administration/synchronisations/page.tsx`                                |
| Page détail run                             | `src/app/(backoffice)/administration/synchronisations/[id]/page.tsx`                           |
