# ADR-0047 : Double authentification obligatoire pour les agents ProConnect

**Date** : 2026-10-05
**Statut** : Accepté

## Contexte

La [feuille de route de sécurité numérique de l'ANSSI](https://cyber.gouv.fr/nous-connaitre/publications/feuilles-de-route-de-la-securite-numerique-de-letat/feuille-de-route-de-securite-numerique-2026-2027/)
impose une authentification multi-facteur aux SI de l'État : avant le 28 février 2027 pour
les SI à enjeux, avant le 28 février 2028 pour tous. Le back-office expose les données
personnelles des demandeurs (identité, adresse, revenus via DN) à des agents AMO, Aller-vers,
DDT et administrateurs, tous connectés par ProConnect.

Trois constats sur l'implémentation existante :

- la requête `/authorize` envoyait `acr_values=eidas1`, niveau que la
  [norme eIDAS de ProConnect](https://github.com/proconnect-gouv/proconnect-espace-partenaires/blob/main/src/pages/docs/fournisseur-service/niveaux-eidas.md)
  classe en authentification simple ; ce paramètre ne figure plus parmi ceux que la
  documentation technique accepte (« tout paramètre supplémentaire génèrera une erreur ») ;
- l'`id_token` et le UserInfo étaient **décodés sans vérification de signature**
  (`decodeToken`, `parseJSONorJWT`) ;
- l'`acr` renvoyé n'était lu nulle part : rien n'aurait permis de refuser une connexion faible.

ProConnect documente la marche à suivre dans
[Forcer la double authentification](https://github.com/proconnect-gouv/proconnect-espace-partenaires/blob/main/src/pages/docs/fournisseur-service/double_authentification.md) :
demander l'`acr` par le paramètre `claims`, et **vérifier obligatoirement** la valeur reçue
côté serveur. Un fournisseur d'identité pas encore compatible MFA est relayé par un OTP mail
de ProConnect (`acr = eidas1-mfa`) : aucun agent n'est bloqué par son fournisseur.

## Décision

> Toute connexion d'un agent exige un `acr` parmi `eidas0-mfa`, `eidas1-mfa`, `eidas2`,
> `eidas3`, dans tous les environnements, sans variable d'activation. La preuve est vérifiée
> au callback sur un `id_token` authentifié, puis portée par la session ; une session agent
> qui ne la porte pas n'existe pas.

Concrètement, dans l'ordre du flux :

1. **Demande** : `claims={"id_token":{"acr":{"essential":true,"values":[…]}}}` remplace
   `acr_values` (`buildClaimsMfaProConnect`). `PC_ACR_VALUES` est supprimée : la liste n'est
   pas configurable, pour qu'aucun environnement ne puisse l'affaiblir.
2. **Authenticité** : l'`id_token` est vérifié avec `jose` — signature, émetteur
   (`<PC_BASE_URL>/api/v2`), audience, `azp` si plusieurs audiences, expiration, nonce. La clé
   est **liée à l'algorithme** et jamais choisie par l'en-tête : ES256/RS256 par le JWKS publié,
   HS256 par le `client_secret`. Les trois sont acceptés car l'algorithme enregistré pour notre
   client n'est pas consultable depuis le dépôt ; une confusion d'algorithmes reste impossible,
   aucune clé publique ne servant de secret HMAC. Un UserInfo signé suit la même vérification.
3. **MFA** : l'`acr` doit être une chaîne exactement égale à l'une des quatre valeurs. Le
   contrôle a lieu **avant** UserInfo et avant `authenticateFromProConnect`, qui écrit
   `lastLogin`, les données de contact et peut remplacer le `sub` : un refus ne laisse aucune
   trace en base. `amr` n'est jamais suffisant.
4. **Sujet** : le `sub` du UserInfo doit égaler celui de l'`id_token` (OIDC Core 5.3.2).
5. **Session** : l'`acr` validé est écrit dans le JWT de session (`proConnectAcr`), signé.
   `getSession` — point de passage de toutes les gardes — rejette toute session dont la méthode
   n'est pas FranceConnect, ou dont le rôle est agent, sans `acr` MFA (`estSessionConforme`).
   La méthode historique par mot de passe, jamais émise, tombe du même coup.
6. **Middleware** : il écarte et efface les cookies d'une session non conforme. Sans cela, une
   ancienne session sur `/connexion/agent` était renvoyée vers l'espace agent, qui la refusait
   et renvoyait à la connexion : boucle. Son décodage n'est pas vérifié et ne sert qu'à refuser,
   jamais à authentifier.
7. **Déconnexion** : elle lit la session signée sans juger sa conformité
   (`lireSessionSignee`), pour qu'une session antérieure puisse encore se fermer chez ProConnect.

Le refus redirige vers `/connexion/agent?error=pc_mfa_required` en effaçant toute session
antérieure, plutôt qu'un 403 littéral comme dans l'exemple de la documentation : c'est le
parcours de toutes les erreurs de connexion du site, et le refus serveur reste effectif.

## Options envisagées

### Option A — Exiger la MFA, vérifier les jetons, invalider les sessions (retenue)

- Avantages : conforme à la documentation ProConnect et à la feuille de route ANSSI ; la
  preuve repose sur un jeton authentifié ; plus aucune session faible dès le déploiement.
- Inconvénients : tous les agents connectés sont déconnectés au déploiement ; ajout d'une
  dépendance (`jose`) ; chaque agent doit enrôler un second facteur à sa prochaine connexion.

### Option B — Exiger la MFA sans vérifier la signature de l'id_token

- Avantages : pas de dépendance ; l'`id_token` arrive par un appel serveur à serveur
  authentifié et en TLS, ce qu'OIDC Core 3.1.3.7 admet en remplacement de la signature.
- Inconvénients : la documentation ProConnect demande la vérification ; la preuve MFA, qui
  devient une condition d'accès, reposerait sur un contenu non authentifié.

### Option C — Activation par variable d'environnement

- Avantages : bascule progressive, retour arrière sans déploiement.
- Inconvénients : un interrupteur de sécurité finit éteint quelque part ; l'écart entre
  environnements fausse la recette.

### Option D — Laisser expirer les sessions ouvertes (8 h)

- Avantages : aucune déconnexion forcée.
- Inconvénients : la MFA ne s'applique pleinement qu'une journée après le déploiement.

## Conséquences

### Positives

- La MFA devient une condition d'accès au back-office, vérifiée en un point unique.
- La signature des jetons ProConnect est enfin contrôlée, indépendamment de la MFA.
- Un agent refusé ne modifie aucune donnée en base.

### Négatives / Risques

- **Déconnexion générale au déploiement** : les agents doivent être prévenus, et à leur
  prochaine connexion ProConnect leur demandera de configurer ou valider un second facteur.
- **Comptes partagés du bac à sable** (`user@yopmail.com`) : y enrôler une application
  d'authentification bloquerait les autres développeurs. Préférer l'OTP mail ou des comptes
  individuels (cf. README).
- **Cohabitation de versions** pendant un déploiement Scalingo : une instance ancienne peut
  encore accepter une session faible quelques secondes. Un retour arrière complet rétablirait
  l'ancien comportement : corriger en avant plutôt que revenir.
- **Re-saisie non garantie** : ProConnect réutilise sa session SSO (12 h) et n'implémente pas
  `max_age`. L'agent n'est pas forcé de re-saisir son second facteur à chaque connexion ;
  l'`acr` exigé reste celui d'une authentification MFA.
- **Algorithme non épinglé** : tant que l'algorithme de notre client n'est pas confirmé dans
  l'espace partenaires, les trois sont acceptés. Une fois connu, le restreindre est une ligne.
- **Documentation ProConnect ambiguë** : `niveaux-acr.md` cite encore l'URI
  `consistency-checked-2fa`, la page MFA les seules valeurs eIDAS ; la discovery (octobre 2026)
  n'annonce plus que les valeurs eIDAS. Aucun alias n'est accepté sans confirmation.

### Migration

- Supprimer `PC_ACR_VALUES` des applications Scalingo (staging, production) et de
  `.env.example` ; restée posée, elle est sans effet.
- Aucune migration de base : la preuve vit dans le cookie de session.

## Liens

- [ADR-0005](0005-auth-oidc-franceconnect-proconnect.md) — authentification OIDC FranceConnect / ProConnect
- [ADR-0029](0029-desactivation-agent-plutot-que-suppression.md) — autre coupure d'accès agent, au même point de contrôle
- Code : `src/features/auth/domain/value-objects/session-mfa.ts`,
  `src/features/auth/adapters/proconnect/proconnect-oidc.ts`,
  `src/features/auth/adapters/proconnect/proconnect.service.ts` (`handleProConnectCallback`),
  `src/features/auth/services/session.service.ts` (`getSession`, `lireSessionSignee`),
  `src/middleware.ts`, `src/app/api/auth/pc/{callback,logout}/route.ts`
- Documentation ProConnect : [double authentification](https://github.com/proconnect-gouv/proconnect-espace-partenaires/blob/main/src/pages/docs/fournisseur-service/double_authentification.md),
  [niveaux eIDAS](https://github.com/proconnect-gouv/proconnect-espace-partenaires/blob/main/src/pages/docs/fournisseur-service/niveaux-eidas.md),
  [implémentation technique](https://github.com/proconnect-gouv/proconnect-espace-partenaires/blob/main/src/pages/docs/fournisseur-service/implementation_technique.md)
