# Création de dossier par un agent Aller-vers

Feature permettant à un agent Aller-vers (AV) de créer proactivement un dossier pour un demandeur rencontré sur le terrain, puis de lui envoyer un email d'invitation à finaliser son inscription via FranceConnect.

## Objectif métier

Avant cette feature, un parcours ne pouvait exister qu'après connexion du demandeur via FranceConnect. Les AV étaient donc cantonnés à un rôle réactif (suivi de prospects auto-créés). Désormais, un AV peut amorcer le dossier lui-même, avec ou sans simulation d'éligibilité, et transférer la main au demandeur via un lien personnel.

## Parcours utilisateur

Bouton **"+ Nouveau dossier"** dans la page liste des dossiers (`/espace-agent/dossiers`), visible uniquement pour les rôles `ALLERS_VERS` et `AMO_ET_ALLERS_VERS`.

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

Le wizard utilise un store Zustand **dédié** (`stores/creation-dossier.store.ts`), volontairement séparé de `useSimulateurStore`. Raison : le simulateur public persiste son état en `sessionStorage`, et utiliser le même store aurait risqué d'écraser la simulation en cours d'un demandeur naviguant dans le même onglet que l'agent.

La simulation complète (parcours 2) passe par `SimulateurEdition` existant, qui gère sa propre persistance. Le wizard ne contient pas les 10 étapes du simulateur inline ; il crée le dossier puis délègue au `SimulateurEdition`.

## Limites connues & TODO

- **Stubs orphelins** : si le demandeur ne clique jamais sur le lien et n'a pas le même email FC, le stub reste indéfiniment. Pas de cleanup automatique. Envisager une tâche de purge > 6 mois.
- **Collisions email** : si plusieurs stubs ont le même email, le fallback email est désactivé (retourne `null`). Seul le claim token permet alors le rattachement.
- **Race au claim** : la mise à jour du stub (`claimStub`) n'est pas wrappée dans une transaction. En pratique, le token unique suffit à éviter le double claim, mais une transaction serait plus rigoureuse.

## Pointeurs de code

| Rôle | Fichier |
|---|---|
| Schéma BDD | `src/shared/database/schema/users.ts`, `src/shared/database/schema/parcours-prevention.ts` |
| Repos | `src/shared/database/repositories/user.repository.ts` (findByClaimToken, createStub, claimStub, upsertFromFranceConnect), `src/shared/database/repositories/parcours-prevention.repository.ts` (findOrCreateForUser, matchesTerritoire) |
| Service | `services/creation-dossier.service.ts` |
| Server action | `actions/create-dossier-aller-vers.action.ts` |
| Store wizard | `stores/creation-dossier.store.ts` |
| Composants wizard | `components/CreationDossierWizard.tsx`, `components/steps/*` |
| Page wizard | `src/app/(backoffice)/espace-agent/dossiers/nouveau/page.tsx` |
| Email template | `src/shared/email/templates/claim-dossier.template.tsx` |
| Email action | `src/shared/email/actions/send-claim-dossier.actions.ts` |
| Route claim public | `src/app/(main)/claim-dossier/[token]/page.tsx` |
| Callback FC modifié | `src/features/auth/adapters/franceconnect/franceconnect.service.ts` (`consumeClaimToken`, `handleFranceConnectCallback`) |
| Callout page prospect | `src/app/(backoffice)/espace-agent/prospects/[id]/components/CalloutSimulationAEffectuer.tsx` |
