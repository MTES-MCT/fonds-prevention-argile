# Création de dossier par un agent (AMO ou Aller-vers)

Feature permettant à un agent AMO ou Aller-vers (AV) de créer proactivement un dossier pour un demandeur rencontré sur le terrain (en accompagnement physique ou téléphonique), puis de lui envoyer un email d'invitation à finaliser son inscription via FranceConnect.

## Objectif métier

Avant cette feature, un parcours ne pouvait exister qu'après connexion du demandeur via FranceConnect. Les agents AMO et AV étaient donc cantonnés à un rôle réactif (suivi de prospects auto-créés). Désormais, un agent peut amorcer le dossier lui-même, avec ou sans simulation d'éligibilité, et transférer la main au demandeur via un lien personnel.

## Parcours utilisateur

### Points d'entrée

Deux entrées vers le wizard, selon le rôle de l'agent :

| Page | Bouton « + Nouveau dossier » | Rôles | URL cible |
|---|---|---|---|
| `/espace-agent/dossiers` | ✅ | AMO + AMO_ET_ALLERS_VERS | `/dossiers/nouveau?intent=amo` |
| `/espace-agent/prospects` | ✅ | ALLERS_VERS + AMO_ET_ALLERS_VERS | `/dossiers/nouveau?intent=av` |

Le param URL **`?intent=av\|amo`** détermine le « chapeau » sous lequel l'agent agit :

- **`intent=amo`** (entrée /dossiers) : le service `createDossierByAgent` **auto-claim** une `parcours_amo_validations` sur l'entreprise AMO de l'agent. Le dossier apparaît immédiatement dans /dossiers. Redirect post-création : `/dossiers`.
- **`intent=av`** (entrée /prospects) : **pas** de claim AMO même si l'agent a un `entrepriseAmoId` (cas AMO_ET_ALLERS_VERS qui crée comme un AV). Le dossier reste un prospect. Redirect post-création : `/prospects`.

L'intent est lu côté serveur dans `/dossiers/nouveau/page.tsx` + `/dossiers/nouveau/simulation/page.tsx` puis posé dans `useCreationDossierStore` au mount. Il est propagé jusqu'au call de `createDossierAllerVersAction` côté client.

**Pourquoi URL plutôt qu'in-memory** : robuste au refresh, le `router.back()` du simulateur préserve l'URL, et l'intent est lisible dans les logs serveur.

### Garde-fous

- AV pur arrivant sur `/espace-agent/dossiers` → redirect server-side vers `/prospects` (la page AMO ne fonctionne pas pour lui de toute façon).
- Forge `?intent=av` par un AMO pur → l'action retourne 400 (« Mode AV demandé mais agent non rattaché à un Aller-vers »).
- Forge `?intent=amo` par un AV pur → le service détecte l'absence d'`entrepriseAmoId` et ne crée pas de validation. Dégradation gracieuse vers le comportement AV.

### Étapes du wizard

Le wizard (`/espace-agent/dossiers/nouveau`) a 4 étapes :

1. **Choix du mode** — "Faire une simulation puis créer" ou "Créer sans simulation".
2. **Identité** — nom + prénom du demandeur.
3. **Coordonnées** — téléphone + email (+ adresse postale en mode sans simulation, via autocomplétion BAN).
4. **Étape 4 dépend du mode :**
   - **Sans simulation** : page « Envoi email » (oui/non) + bouton « Enregistrer le dossier » → `createDossierAllerVersAction`.
   - **Avec simulation** : page `/dossiers/nouveau/simulation` (sans paramètre) qui mount le simulateur. À la fin (résultat éligible/non), bouton « Envoyer et enregistrer le dossier » → `createDossierAllerVersAction` avec `rgaSimulationDataAgent` rempli.

### Création différée du parcours

**Le dossier n'est créé en DB qu'au clic final** sur « Enregistrer le dossier » (ou « Envoyer et enregistrer »). Tant que l'agent navigue dans le wizard et le simulateur, aucune ligne `users` / `parcours_prevention` n'est écrite.

Pourquoi : l'utilisateur s'attend à une création « atomique » correspondant au bouton final. Avant cette refacto, le mode « avec simulation » créait le dossier dès le « Suivant » sur l'étape Coordonnées (parce que le simulateur embarqué avait besoin d'un `parcoursId` pour persister ses réponses). Conséquence : des dossiers orphelins en step `INVITATION` sans simulation en cas d'abandon en cours de simulateur.

Mise en œuvre :

- Le `useCreationDossierStore` (in-memory, non persisté) conserve le formulaire demandeur entre les étapes.
- Le `useSimulateurStore` (sessionStorage) conserve les réponses de la simulation pendant que l'agent l'enchaîne.
- `ResultInvitation` lit le demandeur dans le wizard store + les réponses dans le simulateur store, convertit via `EligibilityService.toRGASimulationData`, et appelle `createDossierAllerVersAction({ demandeur, rgaSimulationDataAgent, sendEmail: isEligible })` en un seul aller-retour serveur.

Après création :

- Si éligible (mode avec simulation) : email d'invitation envoyé au demandeur. Sinon : pas d'envoi.
- Redirection pilotée par l'`intent` du wizard (cf. `getPostCreationRedirectUrl(user, intent)`) :
  - `intent=av` → `/espace-agent/prospects`
  - `intent=amo` → `/espace-agent/dossiers` (ou `/prospects` en fallback si l'agent n'a pas d'`entrepriseAmoId`).

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

Stockée dans `rgaSimulationDataAgent.logement` (JSONB) sous la forme :

```ts
{
  adresse: string;          // label BAN complet
  clef_ban: string;
  commune: string;          // code INSEE (citycode)
  commune_nom: string;
  code_departement: string; // requis pour matchesTerritoire
  code_region: string;
  epci?: string;            // récupéré via getEpciByCommune (API Geo)
  coordonnees: string;      // "lat,lon"
}
```

Pourquoi ces champs : la chaîne de lecture (filtrage territorial `matchesTerritoire`, `InfoLogement` UI, mode édition AMO) opère sur `rgaSimulationData` / `rgaSimulationDataAgent`. Ajouter des colonnes dédiées aurait dupliqué la logique.

**La sélection d'une suggestion BAN est obligatoire** dans le parcours sans simulation : l'agent ne peut pas avancer s'il a tapé l'adresse à la main sans cliquer sur une suggestion. Le bouton « Suivant » est désactivé tant que `demandeur.adresseBienDetails === null`, et un message d'erreur DSFR s'affiche sous le champ. Sans ces données structurées, le dossier n'apparaîtrait pas dans la liste des prospects de l'AV de son territoire (cf. `matchesTerritoire`).

Pour permettre l'affichage des dossiers pré-créés dans la liste d'un AV, `matchesTerritoire()` fallback désormais sur `rgaSimulationDataAgent.logement` quand `rgaSimulationData` est null.

## Rattachement au login FranceConnect

Au callback FC, `upsertFromFranceConnect()` applique dans l'ordre :

1. **Claim token** — si le cookie `FC_CLAIM_TOKEN` est présent et pointe vers un stub valide non expiré, on rattache : le `fcId` est posé, `claimed_at` = `now()`, `claim_token` = `null`.
2. **fcId existant** — comportement historique : user FC reconnu, on met à jour email/nom/prénom/lastLogin.
3. **Fallback email** — si un **unique** stub non réclamé a le même email (case-insensitive), on le rattache au compte FC. Si plusieurs stubs correspondent, on ne rattache pas (ambigu).
4. **Création** — nouveau user FC normal.

Le cookie `FC_CLAIM_TOKEN` est posé par le **Route Handler** `/claim-dossier/[token]/route.ts` (TTL 5 min, httpOnly) avant la redirection vers `/api/auth/fc/login`. C'est volontairement un Route Handler et pas une Page : Next.js 15 interdit de modifier les cookies depuis un Server Component. Le cas « lien invalide » est affiché par la page sœur `/claim-dossier/invalide`. Le cookie est consommé (lu + supprimé) dans `handleFranceConnectCallback`.

### Promotion `rgaSimulationDataAgent` → `rgaSimulationData` au claim

Quand le demandeur se France-connecte sur un parcours en `INVITATION`, `handleFranceConnectCallback` (`features/auth/adapters/franceconnect/franceconnect.service.ts`) fait :

1. `validateInvitation` : avance le step `INVITATION → CHOIX_AMO`.
2. **Si** `rgaSimulationDataAgent` est **complète** (au sens de `isSimulationComplete` du simulateur) et `rgaSimulationData` est null → on copie le contenu via `updateRGAData`.

Pourquoi : `rgaSimulationData` est la donnée canonique lue par `MonCompteClient` (`hasRGAData = !!parcours.rgaSimulationData`), par le filtre territorial AV (`matchesTerritoire`), etc. Sans cette promotion, le demandeur arrive sur « Éligibilité manquante. Suite à une mise à jour, il est impératif de remplir à nouveau le simulateur. » alors que l'agent vient juste de tout remplir.

Pour le parcours **sans simulation**, `rgaSimulationDataAgent` ne contient que `logement.adresse` (et éventuellement `code_departement`/`epci` du BAN). `isSimulationComplete` retourne `false` → pas de promotion → le demandeur voit bien le simulateur à remplir.

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

Le `SimulateurContext` expose un callback `onBackBeyondFirstStep?: () => void` consommé par `NavigationButtons`. Si défini, le bouton "Précédent" reste affiché sur la 1ère étape (history vide) et appelle ce callback à la place du `goBack` interne du store. En invitation, on passe `() => router.back()` → ramène l'agent à `/nouveau` avec le state du wizard intact (l'étape Contact reste pré-remplie). Pas de risque de double création puisqu'aucun dossier n'a été créé en DB à ce stade.

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

- `/espace-agent/dossiers` : redirect server-side `→ /prospects` pour ALLERS_VERS pur (la page n'a pas de sens pour lui). Bouton « + Nouveau dossier » visible pour `AMO | AMO_ET_ALLERS_VERS`, lien `→ /dossiers/nouveau?intent=amo`.
- `/espace-agent/prospects` : bouton « + Nouveau dossier » visible pour `ALLERS_VERS | AMO_ET_ALLERS_VERS`, lien `→ /dossiers/nouveau?intent=av`.
- `/espace-agent/dossiers/nouveau` (wizard) — même check, redirige vers `/espace-agent/dossiers` sinon.
- `/espace-agent/dossiers/nouveau/simulation` (page simulation sans paramètre — état en `useSimulateurStore` + `useCreationDossierStore`) — idem.

Côté server actions :

- `createDossierAllerVersAction` (nom historique conservé pour éviter une cascade de renommages) exige `DOSSIERS_CREATE` + au moins une structure (`user.allersVersId || user.entrepriseAmoId`). Création atomique : user stub + parcours + simulation agent (si fournie) + envoi email (si `sendEmail`).

## Email d'invitation envoyé au demandeur

Deux variantes de wording selon que l'agent a déjà rempli la simulation d'éligibilité ou pas (paramètre `hasSimulation` du template `ClaimDossierTemplate`).

- Cas **avec simulation** : « `{inviterName}` a rempli votre simulation d'éligibilité sur le site du Fonds Prévention Argile... » suivi de « Pour continuer votre demande, il vous suffit de créer votre compte. »
- Cas **sans simulation** : « `{inviterName}` vous invite à créer votre compte sur le site du Fonds Prévention Argile pour déposer votre demande. »

Le `inviterName` est calculé par `getInviterName(agentId)` (`services/inviter-name.service.ts`) avec la priorité : `allers_vers.nom` > `entreprises_amo.nom` > nom complet de l'agent. Permet d'afficher « Mairie d'Issoudun vous invite... » plutôt que le nom de l'agent personne.

- Agent AV pur → nom de la structure Allers-vers.
- Agent AMO pur → raison sociale de l'entreprise AMO.
- Agent `AMO_ET_ALLERS_VERS` (double casquette) → la structure Allers-vers gagne. Choix arbitraire mais cohérent avec le ton « rencontre terrain » de l'invitation. À revisiter si un agent mixte se plaint.

L'envoi a lieu dans `creation-dossier.service.ts` lorsque `createDossierAllerVersAction` est appelée avec `sendEmail: true`, qu'on soit en mode **sans** simulation (depuis `StepEnvoiEmail`) ou **avec** simulation (depuis `ResultInvitation` quand `isEligible` vaut `true`). `hasSimulation` = `!!rgaSimulationDataAgent` passé à l'action.

À la fin de la création, l'agent est redirigé vers la page liste pertinente selon son rôle (cf. `getPostCreationRedirectUrl`).

## Renvoi de l'invitation (demandeur non réclamé)

L'email d'invitation n'était envoyé qu'une fois, à la création. Si le demandeur ne clique jamais le lien (mail perdu, spam, incompréhension), son stub reste à l'étape `INVITATION` sans moyen de relance. Un bouton **« Renvoyer l'email d'invitation »** est désormais affiché sur les **deux** surfaces de détail où atterrit une invitation non réclamée :

- **Détail prospect** (`prospects/[id]`, AV pur sans validation AMO) : callout complet quand `!hasUserClaimed && invitationSentAt`.
- **Détail dossier** (`dossiers/[id]`, invitation créée en mode `amo` → validation AMO présente) : bouton inline sous `InfoDossierCallout` quand `currentStep === INVITATION` et validation != `LOGEMENT_NON_ELIGIBLE`. Sur cette page, `INVITATION` équivaut à « non réclamé » (le claim fait sortir de l'étape via `validateInvitation`).

Détails techniques :

- Service : `services/renvoyer-invitation.service.ts` (`renvoyerInvitationClaim`) — **réutilise** le `claimToken` existant s'il est encore valide, **régénère** sinon (TTL frais via `userRepo.setClaimToken`), puis rappelle `sendClaimDossierEmail`. Gardes métier : dossier créé par un agent, non archivé, demandeur non réclamé (`fcId`/`claimedAt` nuls).
- Action : `prospects/actions/renvoyer-invitation.actions.ts` — accès aligné sur le détail (`verifyProspectTerritoryAccess`, hors territoire = refus) + audit `parcours_actions` (type `invitation_renvoyee`).
- UI : composant partagé `espace-agent/shared/components/RenvoyerInvitationButton.tsx` (prop `variant` : `callout` pour le prospect, `inline` pour le dossier).

## Limites connues & TODO

- **Stubs orphelins** : si le demandeur ne clique jamais sur le lien et n'a pas le même email FC, le stub reste indéfiniment. Pas de cleanup automatique. Envisager une tâche de purge > 6 mois.
- **Collisions email** : si plusieurs stubs ont le même email, le fallback email est désactivé (retourne `null`). Seul le claim token permet alors le rattachement.
- **Race au claim** : la mise à jour du stub (`claimStub`) n'est pas wrappée dans une transaction. En pratique, le token unique suffit à éviter le double claim, mais une transaction serait plus rigoureuse.
- **sessionStorage partagé avec simulateur public** : si un même utilisateur ouvre simulateur public ET wizard invitation dans le même navigateur (cas non réaliste), leurs états s'écrasent. Acceptable car agent ≠ demandeur en pratique.
- **Double soumission** : neutralisée par la refacto « création différée » — le dossier n'est créé qu'au clic final de `ResultInvitation` (ou de `StepEnvoiEmail`). Après succès, on `reset()` les stores avant la redirection ; revenir en arrière via le bouton navigateur ramène sur un wizard vide. Reste un cas marginal : double clic ultra-rapide sur le bouton final → atténué par `disabled={isPending}` mais pas idempotent côté serveur. À renforcer ultérieurement (clé d'idempotence ou verrou sur le couple email+agent+adresse).

## Pointeurs de code

| Rôle | Fichier |
|---|---|
| Schéma BDD | `src/shared/database/schema/users.ts`, `src/shared/database/schema/parcours-prevention.ts` |
| Repos | `src/shared/database/repositories/user.repository.ts` (findByClaimToken, createStub, claimStub, upsertFromFranceConnect), `src/shared/database/repositories/parcours-prevention.repository.ts` (findOrCreateForUser, matchesTerritoire) |
| Service | `services/creation-dossier.service.ts`, `services/inviter-name.service.ts` |
| Server action | `actions/create-dossier-aller-vers.action.ts` (création atomique + envoi email optionnel), `actions/post-creation-redirect.ts` (URL post-création par rôle) |
| Store wizard | `stores/creation-dossier.store.ts` |
| Composants wizard | `components/CreationDossierWizard.tsx`, `components/steps/*` |
| Page wizard | `src/app/(backoffice)/espace-agent/dossiers/nouveau/page.tsx` |
| Email template | `src/shared/email/templates/claim-dossier.template.tsx` |
| Email action | `src/shared/email/actions/send-claim-dossier.actions.ts` |
| Route claim public | `src/app/(main)/claim-dossier/[token]/route.ts` (Route Handler : pose le cookie + redirige FC) + `src/app/(main)/claim-dossier/invalide/page.tsx` (UI erreur) |
| Callback FC modifié | `src/features/auth/adapters/franceconnect/franceconnect.service.ts` (`consumeClaimToken`, `handleFranceConnectCallback`) |
| Callout page prospect | `src/app/(backoffice)/espace-agent/prospects/[id]/components/CalloutSimulationAEffectuer.tsx` |
| Simulateur invitation (étape 3-4/4) | `components/SimulateurEditionInvitation.tsx` (sans props : lit `useCreationDossierStore` + `useSimulateurStore`), `components/ResultInvitation.tsx` (création du dossier au clic final), `src/app/(backoffice)/espace-agent/dossiers/nouveau/simulation/page.tsx` |
| Mode embedded simulateur (partagé) | `src/features/simulateur/components/shared/SimulateurContext.tsx` (props `embedded`, `onBackBeyondFirstStep`), `src/features/simulateur/components/shared/SimulateurLayout.tsx`, `src/features/simulateur/components/shared/NavigationButtons.tsx` |
