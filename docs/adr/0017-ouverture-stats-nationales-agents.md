# ADR-0017 : Ouverture des statistiques nationales aux agents AMO / Allers-Vers

**Date** : 2026-07-06
**Statut** : Accepté

## Contexte

Les acteurs locaux (AMO, Allers-Vers) suivent le fonds avec leurs propres fichiers
Excel, faute de vision partagée. Pour simplifier la compréhension de tous, on veut
**ouvrir les statistiques du fonds à tous les agents**, exprimé côté produit comme
« donner le rôle analyste aux AMO et Allers-Vers pour tous les départements ».

Contraintes techniques et de sécurité :

- Un agent n'a **qu'un seul rôle** (`agents.role`), et ce rôle pilote son **périmètre
  de dossiers** (entreprise AMO / territoire AV). Réassigner `ANALYSTE` leur ferait
  **perdre** l'accès à leurs dossiers.
- Les pages `/administration` visées — **Tableau de bord**, **Acquisition** — sont
  déjà des agrégats nationaux ouverts à l'analyste (cf. [ADR-0014](0014-perimetre-donnees-role-analyste.md)).
  La page **Demandeurs** distingue déjà une vue nominative (`USERS_READ`, admins) d'une
  vue agrégée (`USERS_STATS_READ`, analyste).
- Audit sécurité préalable : la vue « agrégée » `getUsersForStats` ne masquait en réalité
  qu'email + téléphone et **laissait fuiter** vers le client le **token de validation AMO**
  (secret), l'**adresse précise + coordonnées GPS**, le **fcId FranceConnect**, les contacts
  de l'entreprise AMO et les identifiants DS. De même, `getAutresDemandesArchiveesAction`
  (nominatif) ouvrait sa branche territoriale sur `scope.departements.length > 0`, que
  possèdent aussi les AMO/AV.

## Décision

> Nous **superposons** l'accès aux statistiques **nationales** aux rôles AMO,
> ALLERS_VERS et AMO_ET_ALLERS_VERS via une **permission** (`STATS_READ` +
> `USERS_STATS_READ`), **sans changer leur rôle** ni leur périmètre de dossiers.
> Nous introduisons un **scope stats** national distinct du **scope dossiers**
> territorial, nous **durcissons** la vue Demandeurs en une projection réellement
> anonymisée, et nous **supprimons** l'ancienne page « Statistiques » de l'espace
> agent (scopée à l'entreprise) au profit des pages nationales.

Détail :

- **Permissions** (`rbac-permissions.ts`) : `STATS_READ` + `USERS_STATS_READ` ajoutés
  à AMO / ALLERS_VERS / AMO_ET_ALLERS_VERS. **Jamais** `USERS_READ` / `USERS_DETAIL_READ`
  → la liste **nominative** des demandeurs reste réservée aux admins.
- **Accès route** : `canAccessAdministration` inclut ces rôles ; les onglets sensibles
  restent masqués (`minRoles`) et gardés au niveau page (`isAdminRole` / `isSuperAdminRole`).
  Les redirections AMO/AV → espace agent sont retirées des 3 pages stats uniquement.
- **Scope stats** : nouvelle fonction `getStatsScopeFilters` (national pour les rôles
  habilités, territorial pour l'analyste départemental), distincte de `getScopeFilters`
  (dossiers). Utilisée par la page Demandeurs et l'Acquisition — **jamais** de filtre par
  entreprise AMO.
- **Projection anonymisée** : `toStatsProjection` réduit chaque demandeur aux seuls champs
  agrégeables (étape, statut, dates, département/commune, revenu, sinistralité, statut AMO,
  statut DS) et **retire** nom/prénom, email/téléphone, fcId, adresse/coordonnées, token AMO,
  contacts entreprise, identifiants DS, commentaire et tracking email.
- **Anti-fuite nominative** : `getAutresDemandesArchiveesAction` n'ouvre sa branche
  territoriale que pour le rôle `ANALYSTE` (AMO/AV → liste vide malgré leurs départements).
- **Suppression** de `espace-agent/statistiques` (page + feature + onglet).

## Options envisagées

### Mécanisme d'ouverture

#### Option A — Overlay de permission (retenue)

- Avantages : les agents gardent l'accès à **leurs** dossiers (scope inchangé) ; les stats
  deviennent nationales ; changement localisé et testable ; correspond au besoin réel.
- Inconvénients : introduit un second axe de scope (stats vs dossiers) qu'il faut nommer
  et documenter.

#### Option B — Réassigner `agents.role = ANALYSTE`

- Avantages : littéralement « le rôle analyste ».
- Inconvénients : **perte** de l'accès aux dossiers AMO / prospects AV (le rôle pilote le
  périmètre) ; irréversible sans re-migration ; casse le modèle métier. Écartée.

### Vue Demandeurs

#### Option A — Projection anonymisée server-side (retenue)

- Avantages : une seule vue agrégée sûre pour analystes **et** agents ; corrige la fuite
  préexistante (token/adresse/fcId) ; rien de nominatif ne transite vers le client.
- Inconvénients : mapper à maintenir aligné avec les champs consommés par les agrégats.

#### Option B — Ne pas ouvrir la page Demandeurs aux agents

- Avantages : zéro risque PII.
- Inconvénients : contraire à la demande (Demandeurs fait partie des 3 pages à ouvrir).

## Conséquences

### Positives

- Vision partagée du fonds pour tous les agents, sans Excel parallèle.
- Fuite de données **préexistante corrigée** (la vue analyste était déjà trop large).
- Périmètre de dossiers des agents strictement inchangé.

### Négatives / Risques

- Deux notions de scope coexistent (`getScopeFilters` dossiers vs `getStatsScopeFilters`
  stats) : toute nouvelle surface stats doit utiliser la bonne, sous peine de sur- ou
  sous-filtrer. Couvert par tests.
- Les permissions `DOSSIERS_AMO_STATS_READ` / `PROSPECTS_STATS` deviennent **mortes**
  (page espace-agent supprimée) ; conservées comme membres d'enum pour limiter la casse
  de tests, à nettoyer ultérieurement.

### Migration

Aucune migration BDD. Suppression de la route `/espace-agent/statistiques` (404 après
déploiement) et de la feature associée.

## Liens

- Permissions : `src/features/auth/permissions/domain/value-objects/rbac-permissions.ts`
- Accès route : `src/features/auth/permissions/services/backoffice-access.service.ts`
- Scope stats : `src/features/auth/permissions/services/agent-scope.service.ts` (`getStatsScopeFilters`, `canViewNationalStats`)
- Projection : `src/features/backoffice/administration/demandeurs/services/users-tracking.service.ts` (`toStatsProjection`)
- Anti-fuite nominative : `src/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions.ts` (`getAutresDemandesArchiveesAction`)
- ADR liés : [ADR-0014](0014-perimetre-donnees-role-analyste.md) (périmètre analyste), [ADR-0015](0015-navigation-backoffice-unifiee.md) (navigation unifiée)
