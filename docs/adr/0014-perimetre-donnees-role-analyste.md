# ADR-0014 : Périmètre de données et accès du rôle ANALYSTE (national vs DDT départemental)

**Date** : 2026-06-23
**Statut** : Accepté

## Contexte

Les DDT assurent le suivi et le pilotage des acteurs locaux (AMO, Allers-Vers).
Au-delà des statistiques, elles ont besoin d'une visibilité **dossier par dossier**
sur leur territoire pour limiter les temps d'attente des ménages et repérer les
goulots d'étranglement.

Il existait deux rôles distincts pour les analystes : `ANALYSTE` (statistiques,
national ou par département) et `ANALYSTE_DDT` (statistiques restreintes à ses
départements). Cette séparation dupliquait la logique RBAC. La branche
`feat/acces-dossier-ddt` supprime `ANALYSTE_DDT` et fusionne ses prérogatives dans
`ANALYSTE`, qui devient **bimode** (migration `0036_even_hercules` + remap des
agents existants `analyste_ddt → analyste`).

Cette évolution a élargi la surface de l'analyste départemental (il hérite des
permissions de lecture de l'ancien `ANALYSTE` : `USERS_STATS_READ`, `AMO_READ`,
`ALLERS_VERS_READ`), ce qui a exigé de cadrer précisément son **périmètre de
données** pour éviter les fuites.

## Décision

> L'`ANALYSTE` est un rôle **bimode** dont le périmètre dépend des départements
> affectés. Les **données individuelles** (dossiers, demandeurs) sont **scopées au
> territoire** ; les **compteurs agrégés nationaux** restent consultables.

1. **Bimode selon les départements affectés** (table `agent_permissions`) :
   - **National** (0 département) : `isNational = true`. Accès aux **statistiques
     nationales uniquement**, aucun dossier individuel (`canViewAllDossiers = false`).
     La garde du layout espace-agent le renvoie vers `/administration`.
   - **Départemental / « suivi DDT »** (≥ 1 département) : voit les **dossiers de son
     territoire** et peut y **ajouter des messages** (actions).

2. **`canViewAllDossiers` (pas `isNational`) ouvre les données individuelles.**
   `canViewAllDossiers` est réservé aux admins et donne accès au listing/détail de
   **tous** les dossiers. `isNational` (analyste national) n'ouvre que les **stats
   agrégées**. Tout accès à une donnée individuelle (listing dossiers, compteur de
   dossiers, détail) doit se baser sur `canViewAllDossiers`.

3. **Résolution territoriale USER-first.** Prédicat unique
   `matchesTerritoire(getDemandeurFirstSimulation(parcours), departements, epcis)`
   (union département ∪ EPCI), partagé entre le listing, le contrôle d'accès au
   détail (`verifyProspectTerritoryAccess`) et le filtrage des demandeurs.

4. **Données individuelles scopées au territoire** pour l'analyste départemental :
   dossiers (listing + détail), demandeurs (`getUsersWithParcours` filtré par
   département), compteur de dossiers.

5. **Compteurs agrégés nationaux acceptés.** Le Tableau de bord `/administration`
   (visiteurs, simulations, comptes créés…) reste consultable au national par un
   analyste départemental. Ce sont des **agrégats statistiques non nominatifs**, pas
   des données individuelles ; le pilotage national fait partie du rôle analyste.
   Aucun clamp territorial forcé sur le Tableau de bord. (L'onglet Acquisition
   dispose déjà du composant dédié `StatistiquesDepartement`, scopé pour le
   départemental.)

6. **Gestion d'éligibilité interdite, via la garde d'ownership AMO.** Les actions
   `accepterAccompagnement` / `refuserDemandeNonEligible` sont gardées par
   `verifyAmoOwnership` (l'agent doit être l'AMO **propriétaire** de la demande).
   L'analyste n'étant jamais propriétaire AMO, l'action est **refusée** au niveau
   serveur (« permission refusée »). Le composant UI peut s'afficher, mais l'action
   échoue : la garde est au **niveau de l'action** (ownership), pas par masquage UI.
   L'analyste n'a ni `ELIGIBILITE_WRITE` ni `DOSSIERS_CREATE` ; il peut en revanche
   ajouter/éditer ses propres messages (`COMMENTAIRES_*` + territoire).

## Options envisagées

### Option A — Bimode + scope individuel territorial + agrégats nationaux ouverts (retenue)

- Avantages : un seul rôle `ANALYSTE` ; données nominatives strictement
  territoriales ; pilotage national conservé sans complexité multi-département ;
  alignement listing ↔ détail via un prédicat unique.
- Inconvénients : deux conventions de visibilité coexistent (individuel scopé vs
  agrégat national), à expliciter dans la doc pour éviter les erreurs.

### Option B — Conserver `ANALYSTE_DDT` séparé

- Avantages : séparation explicite des deux profils.
- Inconvénients : duplication de rôle et de logique RBAC ; matrice de permissions
  plus lourde ; migration et maintenance accrues.

### Option C — Clamp territorial forcé aussi sur le Tableau de bord national

- Avantages : périmètre strictement territorial partout, cohérence maximale.
- Inconvénients : prive l'analyste du pilotage national (utile et non sensible) ;
  impose de gérer le multi-département alors que le Tableau de bord n'agrège qu'un
  seul département ou le national. Écartée.

## Conséquences

### Positives

- Périmètre de données nominatives strictement aligné sur le territoire de l'agent.
- Un prédicat unique `matchesTerritoire` garantit la cohérence listing ↔ détail
  (pas de « visible en liste mais 404 au détail », ni de fuite inverse).
- Suppression d'un rôle et simplification de la matrice RBAC.

### Négatives / Risques

- Deux conventions de visibilité (individuel scopé vs agrégat national) : risque
  d'erreur si un nouvel écran individuel se base sur `isNational` au lieu de
  `canViewAllDossiers`. À surveiller en revue.
- Le composant d'éligibilité reste affiché à l'analyste (inerte) : sûr côté serveur
  mais perfectible côté UX (masquage possible plus tard, defense in depth).

### Migration

- Migration `0036_even_hercules` : recrée l'enum `agent_role` sans `analyste_ddt` et
  remappe les agents existants (`UPDATE agents SET role='analyste' WHERE role='analyste_ddt'`).
- Fuite corrigée : `getUsersWithParcours` ignorait le filtre département (commenté
  « futur ») → l'analyste départemental voyait tous les demandeurs au national.
  Corrigé via `getScopeFilterConditions` ({departements} pour le départemental, `null`
  pour le national, `noAccess` sinon) + filtrage JS territorial dans le service.
- Onglet Statistiques de l'espace agent masqué pour l'analyste (panneau AMO-centré).

## Liens

- Branche : `feat/acces-dossier-ddt`
- Documentation : [docs/security/RBAC-ROLES.md](../security/RBAC-ROLES.md)
- Enum des rôles : `src/shared/domain/value-objects/user-role.enum.ts`
- Périmètre données agent : `src/features/auth/permissions/services/agent-scope.service.ts`
- Filtrage demandeurs : `src/features/backoffice/administration/demandeurs/services/users-tracking.service.ts`
- Garde espace agent : `src/app/(backoffice)/espace-agent/layout.tsx`
- Garde éligibilité (ownership AMO) : `src/features/backoffice/espace-agent/demandes/actions/demande-detail.actions.ts`
- Migration : `src/shared/database/migrations/0036_even_hercules.sql`
