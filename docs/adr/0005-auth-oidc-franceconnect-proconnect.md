# ADR-0005 : Authentification OIDC — FranceConnect (demandeurs) et ProConnect (agents)

**Date** : 2025-12-01
**Statut** : Accepté

## Contexte

Deux populations distinctes utilisent l'application :

- les **demandeurs** (citoyens), qui doivent prouver leur identité ;
- les **agents** de l'État (AMO, analystes, DDT, admins), qui agissent dans un cadre professionnel.

L'État fournit deux fédérateurs d'identité OIDC adaptés : **FranceConnect** (citoyens) et **ProConnect** (agents publics). Il faut aussi une gestion de session côté application.

## Décision

Nous utilisons deux fournisseurs OIDC selon la population, et une **gestion de session JWT maison** :

- **Demandeurs → FranceConnect** (OIDC, env `FC_*`). Rôle attribué : `PARTICULIER`.
- **Agents → ProConnect** (OIDC, env `PC_*`). Rôles agents/admin contrôlés par RBAC.
- **Session** : JWT signé HS256 (`crypto.createHmac`, secret `JWT_SECRET`) stocké en cookie httpOnly/secure/SameSite=Lax. Durée : 24 h particulier, 8 h admin. State/nonce en cookies éphémères (5 min) pour la protection CSRF/OIDC.

> Nous fédérons l'identité via FranceConnect et ProConnect, et gérons la session avec un JWT signé maison plutôt qu'une librairie d'auth.

## Options envisagées

### Option A — FranceConnect + ProConnect + JWT maison (retenue)

- Avantages : fédérateurs officiels de l'État (pas de mots de passe à stocker côté demandeur), séparation nette citoyen/agent, session légère et maîtrisée, dépendances minimales.
- Inconvénients : implémentation OIDC et JWT à maintenir nous-mêmes (state, nonce, échange de code, vérification de signature).

### Option B — NextAuth / Auth.js avec providers OIDC custom

- Avantages : moins de code d'auth à écrire, sessions gérées.
- Inconvénients : abstraction lourde pour deux providers spécifiques État, configuration FC/PC moins directe, couplage à la lib.

### Option C — Mots de passe locaux pour les agents

- Avantages : simple, pas de dépendance OIDC pour les agents.
- Inconvénients : gestion de secrets, hash, reset, sécurité à notre charge ; non aligné avec ProConnect. (argon2 ne subsiste que comme fallback legacy/test.)

## Conséquences

### Positives

- Aucun mot de passe demandeur stocké ; agents authentifiés via ProConnect.
- L'accès agent vérifie à la fois `auth = ProConnect` et le rôle (`checkProConnectAccess` + `checkRoleAccess`).

### Négatives / Risques

- Le code OIDC/JWT maison est sensible : toute évolution doit préserver la vérification de state/nonce et de signature.
- L'email FranceConnect est non modifiable — le mail de contact est séparé (`emailContact`).

## Liens

- FranceConnect : `src/features/auth/adapters/franceconnect/`
- ProConnect : `src/features/auth/adapters/proconnect/`
- Sessions / JWT : `src/features/auth/utils/jwt.utils.ts`, `src/features/auth/domain/value-objects/configs/session.config.ts`
- Rôles : `src/shared/domain/value-objects/user-role.enum.ts`
- Permissions : `src/features/auth/permissions/services/permissions.service.ts`
