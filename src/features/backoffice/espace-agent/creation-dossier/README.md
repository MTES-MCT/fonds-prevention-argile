# Création de dossier par un agent (AMO ou Aller-vers)

Feature permettant à un agent AMO ou Aller-vers (AV) de créer proactivement un dossier pour un demandeur rencontré sur le terrain (en accompagnement physique ou téléphonique), puis de lui envoyer un email d'invitation à finaliser son inscription via FranceConnect.

## Objectif métier

Avant cette feature, un parcours ne pouvait exister qu'après connexion du demandeur via FranceConnect. Les agents AMO et AV étaient donc cantonnés à un rôle réactif (suivi de prospects auto-créés). Désormais, un agent peut amorcer le dossier lui-même, avec ou sans simulation d'éligibilité, et transférer la main au demandeur via un lien personnel.

## Parcours utilisateur

Bouton **"+ Nouveau dossier"** dans la page liste des dossiers (`/espace-agent/dossiers`), visible pour les rôles `AMO`, `ALLERS_VERS` et `AMO_ET_ALLERS_VERS` (permission `DOSSIERS_CREATE`).

Le wizard (`/espace-agent/dossiers/nouveau`) a 3 étapes :

1. **Choix du mode** — "Faire une simulation puis créer" ou "Créer sans simulation".
2. **Coordonnées** — 3 sous-panneaux : identité (nom/prénom), contact (tel/email), adresse du bien.
3. **Envoi email** — Envoyer ou non un email d'invitation FranceConnect.

Après validation :

- Le dossier est créé en une seule passe (user stub + parcours + adresse en simulation minimale si besoin).
- Si l'agent avait choisi **"avec simulation"**, on redirige vers la page prospect avec `?action=simulation`, qui redirige immédiatement vers `SimulateurEdition` (le composant existant qui opère sur un dossier persisté).
- Sinon, on redirige vers la page prospect ; un callout jaune "Simulation à effectuer" y invite à lancer la simulation plus tard.

## Modèle de données

### `users.fcId` est devenu nullable

Un user "stub" (sans FranceConnect) peut exister. La contrainte `UNIQUE` est conservée : Postgres autorise plusieurs `NULL` sur un `UNIQUE`.

### `users.claim_token`, `claim_token_expires_at`, `claimed_at`

- `claim_token` (varchar 128, UNIQUE) : jeton aléatoire (48 chars base URL-safe) posé sur le stub à la création. Durée de vie 90 jours.
- `claim_token_expires_at` : date d'expiration.
- `claimed_at` : date de rattachement effectif au moment du login FC (le token est invalidé à ce moment-là).

### `parcours_prevention.created_by_agent_id`

FK nullable vers `agents(id)` (`ON DELETE SET NULL`). Trace l'agent qui a créé le dossier — utile pour les statistiques et pour filtrer les dossiers créés par un AV.

### Adresse du bien

Stockée dans `rgaSimulationDataAgent.logement` (JSONB) sous la forme `{ adresse: "..." }`, même en l'absence de simulation complète. Raison : toute la chaîne de lecture (filtrage territorial `matchesTerritoire`, `InfoLogement` UI) opère sur `rgaSimulationData` / `rgaSimulationDataAgent`. Ajouter des colonnes dédiées aurait dupliqué la logique.

Pour permettre l'affichage des dossiers pré-créés dans la liste d'un AV, `matchesTerritoire()` fallback désormais sur `rgaSimulationDataAgent.logement` quand `rgaSimulationData` est null.

## Rattachement au login FranceConnect

Au callback FC, `upsertFromFranceConnect()` applique dans l'ordre :

1. **Claim token** — si le cookie `FC_CLAIM_TOKEN` est présent et pointe vers un stub valide non expiré, on rattache : le `fcId` est posé, `claimed_at` = `now()`, `claim_token` = `null`.
2. **fcId existant** — comportement historique : user FC reconnu, on met à jour email/nom/prénom/lastLogin.
3. **Fallback email** — si un **unique** stub non réclamé a le même email (case-insensitive), on le rattache au compte FC. Si plusieurs stubs correspondent, on ne rattache pas (ambigu).
4. **Création** — nouveau user FC normal.

Le cookie `FC_CLAIM_TOKEN` est posé par `/claim-dossier/[token]/page.tsx` (TTL 5 min, httpOnly) avant la redirection vers `/api/auth/fc/login`. Il est consommé (lu + supprimé) dans `handleFranceConnectCallback`.

## Isolation front

Le wizard utilise un store Zustand **dédié** au state local (`stores/creation-dossier.store.ts` : currentStep + demandeur form + wantsSimulation + sendEmail) — séparé de `useSimulateurStore`.

## Intégration du simulateur dans le wizard (parcours 2 "avec simulation")

L'étape 3/4 du wizard avec simulation affiche les 10 étapes du simulateur **inline** dans la carte du wizard AV (layout breadcrumb + carte blanche + stepper "Étape 3 sur 4"). Pour atteindre ce rendu sans dupliquer la logique du simulateur, on réutilise les composants existants `SimulateurFormulaire` / `SimulateurEdition` avec deux adaptations légères :

### 1. Mode `embedded` du `SimulateurContext`

Le `SimulateurContext` expose un prop `embedded?: boolean`. Quand il vaut `true` :
- `SimulateurLayout` rend **uniquement** le contenu de l'étape (title + subtitle + children), sans son wrapping externe (carte grise, formTitle "Simulateur d'éligibilité au Fonds Prévention Argile", lien "Besoin d'aide ?", ProgressBar interne).
- Le simulateur s'intègre ainsi visuellement dans la carte du wizard parent qui fournit son propre stepper.

Le simulateur public et l'édition AMO n'utilisent pas `embedded` → leur rendu reste inchangé.

### 2. Composant `SimulateurEditionInvitation`

Variante de `SimulateurEdition` pour le contexte invitation, qui :
- Pose `embedded: true` sur le `SimulateurProvider`.
- **Skip l'écran INTRO** : initialise le store directement à `TYPE_LOGEMENT` avec `history: []` (via `useSimulateurStore.setState` direct). Évite à l'agent de cliquer sur "Démarrer" puisqu'il sait déjà ce qu'il fait.
- Désactive le bouton "Précédent" natif du simulateur sur la 1ère étape (conséquence de `history: []` qui rend `canGoBack = false`).

### 3. Store simulateur partagé (compromis assumé)

`SimulateurEditionInvitation` **partage le store singleton `useSimulateurStore`** avec le simulateur public et le mode édition AMO (clé sessionStorage unique `fonds-argile-simulateur`).

**Pourquoi pas un store dédié ?** Une factory + Context Provider permettrait d'isoler chaque contexte. Trade-off rejeté : surface API trop large (3 fichiers du simulateur public à refactorer, Provider obligatoire partout, risque de régression). En pratique :
- Le simulateur public est utilisé par des **demandeurs** ; le wizard invitation par des **agents**. Pas de scénario de concurrence réaliste.
- Le mode édition AMO partage **déjà** ce store singleton depuis sa création (commit `6a19aa12`, février 2026). On prolonge l'usage existant.
- `reset()` + `setEditMode(true)` au mount + `setEditMode(false)` au démontage isolent les sessions dans le temps.

### 4. Bouton "Précédent" depuis la 1ère étape du simulateur

Le `SimulateurContext` expose un callback `onBackBeyondFirstStep?: () => void` consommé par `NavigationButtons`. Si défini, le bouton "Précédent" reste affiché sur la 1ère étape (history vide) et appelle ce callback à la place du `goBack` interne du store. En invitation, on passe `() => router.back()` → ramène l'agent à `/nouveau` avec le state du wizard intact (l'étape Contact reste pré-remplie).

C'est aussi pour cette raison qu'on retire le `reset()` dans `StepContact.handleNext` après la création du dossier : on conserve le state pour le retour.

Le simulateur public et l'édition AMO ne définissent pas `onBackBeyondFirstStep` → comportement inchangé (pas de bouton Précédent sur la 1ère étape).

## Contrôle d'accès (AMO + Aller-vers)

La création de dossier est ouverte aux agents AMO **et** Aller-vers, via une permission dédiée `DOSSIERS_CREATE` (catalogue : `src/features/auth/permissions/domain/value-objects/rbac-permissions.ts`).

| Rôle | `DOSSIERS_CREATE` |
|---|---|
| `AMO` | ✅ |
| `ALLERS_VERS` | ✅ |
| `AMO_ET_ALLERS_VERS` | ✅ |
| `ADMINISTRATEUR` / `ANALYSTE` / `SUPER_ADMINISTRATEUR` (lecture seule) | ❌ |

Pourquoi une permission dédiée plutôt que `PROSPECTS_VIEW` (utilisée auparavant) : `PROSPECTS_VIEW` représente la lecture des prospects de territoire AV. Étendre cette permission à AMO aurait élargi par accident son périmètre de visibilité (liste prospects, stats prospects, etc.). `DOSSIERS_CREATE` cible uniquement l'écriture de création de dossier.

Côté pages :

- `/espace-agent/dossiers` (bouton + Nouveau dossier) — autorise `AMO | ALLERS_VERS | AMO_ET_ALLERS_VERS`.
- `/espace-agent/dossiers/nouveau` (wizard) — même check, redirige vers `/espace-agent/dossiers` sinon.
- `/espace-agent/dossiers/nouveau/simulation/[parcoursId]` — idem.

Côté server actions :

- `createDossierAllerVersAction` (nom historique conservé pour éviter une cascade de renommages) et `sendInvitationEmailAction` exigent `DOSSIERS_CREATE` + au moins une structure (`user.allersVersId || user.entrepriseAmoId`).

## Email d'invitation envoyé au demandeur

Deux variantes de wording selon que l'agent a déjà rempli la simulation d'éligibilité ou pas (paramètre `hasSimulation` du template `ClaimDossierTemplate`).

- Cas **avec simulation** : « `{inviterName}` a rempli votre simulation d'éligibilité sur le site du Fonds Prévention Argile... » suivi de « Pour continuer votre demande, il vous suffit de créer votre compte. »
- Cas **sans simulation** : « `{inviterName}` vous invite à créer votre compte sur le site du Fonds Prévention Argile pour déposer votre demande. »

Le `inviterName` est calculé par `getInviterName(agentId)` (`services/inviter-name.service.ts`) avec la priorité : `allers_vers.nom` > `entreprises_amo.nom` > nom complet de l'agent. Permet d'afficher « Mairie d'Issoudun vous invite... » plutôt que le nom de l'agent personne.

- Agent AV pur → nom de la structure Allers-vers.
- Agent AMO pur → raison sociale de l'entreprise AMO.
- Agent `AMO_ET_ALLERS_VERS` (double casquette) → la structure Allers-vers gagne. Choix arbitraire mais cohérent avec le ton « rencontre terrain » de l'invitation. À revisiter si un agent mixte se plaint.

L'envoi a lieu :
- En mode **sans simulation** : depuis `creation-dossier.service.ts` à la création du dossier (`StepEnvoiEmail`). `hasSimulation = false` toujours.
- En mode **avec simulation** : depuis `send-invitation-email.action.ts`, déclenché par `ResultInvitation` à la fin du wizard. `hasSimulation = !!parcours.rgaSimulationDataAgent` (true en pratique).

À la fin de la création (les 2 parcours), l'agent est redirigé vers `/espace-agent/dossiers`.

## Limites connues & TODO

- **Stubs orphelins** : si le demandeur ne clique jamais sur le lien et n'a pas le même email FC, le stub reste indéfiniment. Pas de cleanup automatique. Envisager une tâche de purge > 6 mois.
- **Collisions email** : si plusieurs stubs ont le même email, le fallback email est désactivé (retourne `null`). Seul le claim token permet alors le rattachement.
- **Race au claim** : la mise à jour du stub (`claimStub`) n'est pas wrappée dans une transaction. En pratique, le token unique suffit à éviter le double claim, mais une transaction serait plus rigoureuse.
- **sessionStorage partagé avec simulateur public** : si un même utilisateur ouvre simulateur public ET wizard invitation dans le même navigateur (cas non réaliste), leurs états s'écrasent. Acceptable car agent ≠ demandeur en pratique.
- **Double soumission possible** : après création du dossier via le wizard, l'agent peut revenir à `/nouveau` (via "Revenir à l'étape précédente") avec le state intact. Re-cliquer "Suivant" sur l'étape Contact créera un 2ème dossier (cas rare). À gérer ultérieurement en marquant le store wizard avec un `lastSubmittedParcoursId`.

## Pointeurs de code

| Rôle | Fichier |
|---|---|
| Schéma BDD | `src/shared/database/schema/users.ts`, `src/shared/database/schema/parcours-prevention.ts` |
| Repos | `src/shared/database/repositories/user.repository.ts` (findByClaimToken, createStub, claimStub, upsertFromFranceConnect), `src/shared/database/repositories/parcours-prevention.repository.ts` (findOrCreateForUser, matchesTerritoire) |
| Service | `services/creation-dossier.service.ts`, `services/inviter-name.service.ts` |
| Server action | `actions/create-dossier-aller-vers.action.ts`, `actions/send-invitation-email.action.ts` |
| Store wizard | `stores/creation-dossier.store.ts` |
| Composants wizard | `components/CreationDossierWizard.tsx`, `components/steps/*` |
| Page wizard | `src/app/(backoffice)/espace-agent/dossiers/nouveau/page.tsx` |
| Email template | `src/shared/email/templates/claim-dossier.template.tsx` |
| Email action | `src/shared/email/actions/send-claim-dossier.actions.ts` |
| Route claim public | `src/app/(main)/claim-dossier/[token]/page.tsx` |
| Callback FC modifié | `src/features/auth/adapters/franceconnect/franceconnect.service.ts` (`consumeClaimToken`, `handleFranceConnectCallback`) |
| Callout page prospect | `src/app/(backoffice)/espace-agent/prospects/[id]/components/CalloutSimulationAEffectuer.tsx` |
| Simulateur invitation (étape 3/4) | `components/SimulateurEditionInvitation.tsx`, `src/app/(backoffice)/espace-agent/dossiers/nouveau/simulation/[parcoursId]/page.tsx` |
| Mode embedded simulateur (partagé) | `src/features/simulateur/components/shared/SimulateurContext.tsx` (props `embedded`, `onBackBeyondFirstStep`), `src/features/simulateur/components/shared/SimulateurLayout.tsx`, `src/features/simulateur/components/shared/NavigationButtons.tsx` |
