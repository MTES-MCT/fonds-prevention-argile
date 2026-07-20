# RBAC — rôles, permissions et espaces

Document de référence sur le contrôle d'accès : qui peut se connecter, avec quel
fournisseur d'identité, et à quoi chaque rôle a accès.

> À lire pour toute évolution touchant aux rôles, aux gardes de route, au
> back-office ou au périmètre de données d'un agent. Voir aussi
> [ADR-0005](../adr/0005-auth-oidc-franceconnect-proconnect.md).

---

## 1. Les deux mondes d'authentification

| Population   | Fournisseur d'identité | Méthode (`authMethod`) | Rôle attribué             |
| ------------ | ---------------------- | ---------------------- | ------------------------- |
| Demandeurs   | FranceConnect          | `franceconnect`        | `PARTICULIER` (fixe)      |
| Agents/admin | ProConnect             | `proconnect`           | un des rôles agent (RBAC) |

Le `middleware.ts` aiguille selon la route demandée : `/mon-compte`,
`/mes-dossiers`, `/mes-demandes` → connexion FranceConnect ; `/administration/*`,
`/espace-agent/*` → connexion ProConnect. L'accès agent vérifie donc **deux
choses** : `checkProConnectAccess()` (bonne méthode d'auth) **et** le rôle.

> `AUTH_METHODS.PASSWORD` existe encore dans les constantes mais n'est pas utilisé
> en production (fallback legacy/test ; argon2 n'a pas d'usage applicatif réel).

Source : `src/middleware.ts`, `src/features/auth/domain/value-objects/constants.ts`.

---

## 2. Les rôles

Enum : `src/shared/domain/value-objects/user-role.enum.ts`.

| Rôle                   | Catégorie | Résumé                                                                 |
| ---------------------- | --------- | ---------------------------------------------------------------------- |
| `PARTICULIER`          | Demandeur | Propriétaire authentifié FranceConnect, suit son propre parcours       |
| `SUPER_ADMINISTRATEUR` | Admin     | Accès total (toutes permissions)                                       |
| `ADMINISTRATEUR`       | Admin     | Back-office complet sauf gestion des agents                            |
| `ANALYSTE`             | Agent     | Bimode : national (stats) sans département, ou suivi DDT départemental |
| `AMO`                  | Agent     | Dossiers de son entreprise AMO                                         |
| `ALLERS_VERS`          | Agent     | Prospects de son territoire (dossiers sans AMO)                        |
| `AMO_ET_ALLERS_VERS`   | Agent     | Cumul AMO + Allers-Vers (union des périmètres)                         |

Helpers : `isAgentRole`, `isAdminRole`, `isSuperAdminRole`, `isValidRole`.
Groupes : `ADMIN_ROLES` (super-admin + admin), `AGENT_ROLES` (tous sauf
`PARTICULIER`).

---

## 3. Rôle → espace accessible

Deux grands espaces back-office, gardés au niveau des `layout.tsx` / `page.tsx`.

| Espace / route                                  | Rôles autorisés                                                                                                                            | Espace de repli                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `/mon-compte`, `/mes-dossiers`, `/mes-demandes` | `PARTICULIER` (FranceConnect)                                                                                                              | `/connexion`                                |
| `/administration/*`                             | `SUPER_ADMINISTRATEUR`, `ADMINISTRATEUR`, `ANALYSTE`, **`AMO` / `ALLERS_VERS` / `AMO_ET_ALLERS_VERS`** (onglets stats seulement, ADR-0017) | `PARTICULIER` → `/connexion`                |
| `/espace-agent/*`                               | `AMO`, `ALLERS_VERS`, `AMO_ET_ALLERS_VERS`, `ANALYSTE` (départemental), `SUPER_ADMINISTRATEUR`                                             | admin/analyste national → `/administration` |

Redirection par défaut après connexion (selon rôle) : admins/analystes →
`/administration` ; AMO/AV → `/espace-agent` ; particulier → `/mon-compte`.

> Un `ANALYSTE` avec au moins un département (mode « suivi DDT ») accède aussi à
> l'espace agent pour consulter les dossiers de son territoire et y ajouter des
> messages. Un `ANALYSTE` sans département (national) reste cantonné aux stats :
> la garde du layout espace-agent le renvoie vers `/administration`.

Gardes principales :

- Espace agent : `src/app/(backoffice)/espace-agent/layout.tsx`
  (`checkProConnectAccess` + `getCurrentAgent` + `checkRoleAccess([...])`).
- Administration : `src/app/(backoffice)/administration/page.tsx`
  (`checkAgentAccess` ; tout agent rend le tableau de bord depuis ADR-0017, les
  onglets sensibles restant gardés par page). Les sous-pages sensibles gardent leur
  propre garde de rôle (`isAdminRole` / `isSuperAdminRole`).
- Garde entreprise AMO : `src/app/(backoffice)/components/AmoGuard.tsx` — bloque
  un `AMO` / `AMO_ET_ALLERS_VERS` sans entreprise rattachée.
- Routes : `src/features/auth/domain/value-objects/configs/routes.config.ts`.

### 3.1 Navigation backoffice (deux rangées, pilotées par rôle) — ADR-0015

La barre de navigation backoffice est unifiée : deux rangées empilées dont la
visibilité dépend du **rôle** (capacités), pas de l'URL. Rangée 1 = Pilotage
(`/administration`), Rangée 2 = Suivi des dossiers (`/espace-agent`). La barre ne rend
que sur les préfixes backoffice (garde de chemin, car le `Header` est partagé avec le
site public). La nav n'est qu'un affichage : la barrière reste les gardes de layout /
page / Server Actions.

> Depuis ADR-0017, la Rangée 2 n'a plus qu'un onglet **Dossiers** : l'ancienne page
> « Statistiques » de l'espace agent (scopée à l'entreprise) est supprimée, remplacée
> par les stats **nationales** de la Rangée 1 (Tableau de bord / Acquisition / Demandeurs),
> désormais ouvertes aux agents AMO / Allers-Vers.

| Rôle                     | Rangée 1 — Pilotage                                                                                 | Rangée 2 — Dossiers |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ------------------- |
| `SUPER_ADMINISTRATEUR`   | Tableau de bord, Acquisition, Demandeurs, Agents, AMO, Allers Vers, Notes, Synchros, Diagnostics DN | Dossiers            |
| `ADMINISTRATEUR`         | Tableau de bord, Acquisition, Demandeurs, AMO, Allers Vers                                          | —                   |
| `ANALYSTE` national      | Tableau de bord, Acquisition, Demandeurs                                                            | —                   |
| `ANALYSTE` départemental | Tableau de bord, Acquisition, Demandeurs                                                            | Dossiers            |
| `AMO`                    | Tableau de bord, Acquisition, Demandeurs                                                            | Dossiers            |
| `ALLERS_VERS`            | Tableau de bord, Acquisition, Demandeurs                                                            | Dossiers            |
| `AMO_ET_ALLERS_VERS`     | Tableau de bord, Acquisition, Demandeurs                                                            | Dossiers            |

- `canAccessAdministration` = `SUPER_ADMINISTRATEUR` / `ADMINISTRATEUR` / `ANALYSTE` /
  **`AMO` / `ALLERS_VERS` / `AMO_ET_ALLERS_VERS`** (ADR-0017). Le filtrage par onglet de
  la rangée 1 reste celui de `ADMIN_NAV_TABS.minRoles` : les AMO/AV n'y voient que les
  trois onglets stats (Tableau de bord, Acquisition, Demandeurs), les onglets sensibles
  restant masqués.
- `canAccessEspaceAgent` = `SUPER_ADMINISTRATEUR` / `AMO` / `ALLERS_VERS` /
  `AMO_ET_ALLERS_VERS`, **ou** `ANALYSTE` avec au moins un département. Aligné sur la
  garde du layout espace-agent. Les deux booléens sont calculés côté serveur et exposés
  via `/api/auth/check` (le statut départemental d'un analyste vit en base, pas dans le
  rôle).

---

## 4. Permissions fines et onglets

Le détail des permissions par rôle est dans la matrice
`src/features/auth/permissions/domain/value-objects/rbac-permissions.ts`
(`ROLE_PERMISSIONS`, `TAB_PERMISSIONS`). Vérifications :

- `checkBackofficePermission(permission)` — une permission précise (ex.
  `AMO_WRITE`, `STATS_READ`).
- `checkTabAccess(tabKey)` / `canAccessTab(role, tabKey)` — accès à un onglet
  back-office (logique OR : au moins une permission requise par l'onglet).

Service : `src/features/auth/permissions/services/permissions.service.ts` et
`rbac.service.ts`.

Repères de permissions par rôle :

- **SUPER_ADMINISTRATEUR** : toutes.
- **ADMINISTRATEUR** : stats, users, AMO (R/W/import/delete), allers-vers
  (R/W/import/delete), étapes (éligibilité/diagnostic/devis/factures en lecture),
  commentaires (lecture globale). Pas la gestion des agents.
- **ANALYSTE** : lecture stats (national ou départemental, voir §5). En mode
  départemental (suivi DDT), peut aussi ajouter/éditer ses propres messages
  (`COMMENTAIRES_*`) sur les dossiers de son territoire, et **lire** le détail d'une
  demande d'accompagnement (« vérifier l'éligibilité ») de son territoire en
  **lecture seule** — `getDemandeDetail` ouvre cette lecture via
  `verifyProspectTerritoryAccess` (comme le détail dossier), hors territoire = 404.
  Ne gère pas l'éligibilité (`ELIGIBILITE_WRITE`) et ne crée pas de dossier
  (`DOSSIERS_CREATE`). La gestion d'éligibilité (`accepterAccompagnement` /
  `refuserDemandeNonEligible`) est en outre gardée par `verifyAmoOwnership` :
  l'analyste n'étant jamais propriétaire AMO de la demande, l'action échoue côté
  serveur (« Accès réservé aux AMO »). Le composant UI peut s'afficher mais reste
  inerte pour lui — la garde est au niveau de l'action, pas par masquage. Voir
  [ADR-0014](../adr/0014-perimetre-donnees-role-analyste.md).
- **AMO** : dossiers AMO (lecture + stats), création de dossier, commentaires
  (création + édition/suppression des siens). **+ stats NATIONALES** (`STATS_READ`,
  `USERS_STATS_READ`) : Tableau de bord, Acquisition et Demandeurs agrégés à l'échelle
  nationale (ADR-0017) — jamais la liste nominative (`USERS_READ`/`USERS_DETAIL_READ`).
- **ALLERS_VERS** : prospects (vue + détail + stats), création de dossier,
  commentaires. **+ stats NATIONALES** (idem AMO, ADR-0017).
- **AMO_ET_ALLERS_VERS** : union AMO + Allers-Vers, **+ stats NATIONALES** (idem).

> **Scope stats ≠ scope dossiers (ADR-0017).** L'ouverture des stats aux agents ne
> touche PAS leur périmètre de dossiers (toujours territorial / par entreprise). Un
> **scope stats** national dédié (`getStatsScopeFilters`) est utilisé par les surfaces
> statistiques ; il ne renvoie jamais de filtre par entreprise. La page Demandeurs leur
> sert une **projection anonymisée** (`toStatsProjection`) : ni nom/prénom, ni email/tél,
> ni adresse/coordonnées, ni token AMO, ni identifiants DS.

---

## 5. Périmètre de données (scope) par rôle

Au-delà du « peut accéder à la page », un agent ne voit qu'un sous-ensemble des
données. Calculé dans
`src/features/auth/permissions/services/agent-scope.service.ts`.

| Rôle                | Voit tout | Par entreprise AMO | Dossiers sans AMO | Périmètre                                       |
| ------------------- | --------- | ------------------ | ----------------- | ----------------------------------------------- |
| SUPER_ADMIN / ADMIN | oui       | oui                | oui               | national                                        |
| AMO                 | non       | oui                | non               | son entreprise AMO                              |
| ALLERS_VERS         | non       | non                | oui               | ses départements / EPCI                         |
| AMO_ET_ALLERS_VERS  | non       | oui                | oui               | union entreprise AMO + territoire AV            |
| ANALYSTE            | non       | non                | non               | national (stats) si aucun dept, sinon ses depts |

> La colonne « Périmètre » décrit le scope **dossiers**. Le scope **stats** est
> distinct (ADR-0017) : national pour AMO / ALLERS_VERS / AMO_ET_ALLERS_VERS et
> l'analyste national, territorial pour l'analyste départemental. Voir §4.

Distinctions clés :

- **ANALYSTE bimode (stats vs dossiers)** : sans département affecté, l'`ANALYSTE`
  est national mais ne voit que les **statistiques** — aucun dossier individuel
  (`canViewAllDossiers = false`, la garde du layout espace-agent le renvoie vers
  `/administration`). Avec un ou plusieurs départements (mode « suivi DDT »), il
  accède aux **dossiers de ces territoires** et peut y ajouter des messages.
  C'est `canViewAllDossiers` (réservé aux admins) — et non `isNational` (stats) —
  qui ouvre le détail d'un dossier hors territoire.
- **Données individuelles scopées, agrégats nationaux ouverts** : pour l'analyste
  départemental, les **données individuelles** sont strictement territoriales —
  dossiers (listing + détail), demandeurs (`getUsersWithParcours` filtré par
  département), compteur de dossiers. En revanche, les **compteurs agrégés
  nationaux** du Tableau de bord **et de l'Acquisition** `/administration` (visiteurs,
  simulations, comptes créés, funnels…) restent consultables : ce sont des agrégats
  non nominatifs et le pilotage national fait partie du rôle. Décision assumée, voir
  [ADR-0014](../adr/0014-perimetre-donnees-role-analyste.md) (Acquisition réaligné en
  national, [ADR-0015](../adr/0015-navigation-backoffice-unifiee.md) — la vue
  départementale forcée a été retirée ; le territorial vit dans l'onglet Dossiers).
- **ALLERS_VERS vs AMO_ET_ALLERS_VERS** : l'allers-vers seul ne voit que les
  dossiers sans AMO de son territoire ; la version fusionnée cumule aussi les
  dossiers de son entreprise AMO. La version fusionnée requiert une entreprise AMO
  ET un identifiant allers-vers.

---

## 6. Cohérence listing ↔ détail (résolution territoriale)

> **Règle** : le contrôle d'accès au **détail** d'un dossier/prospect doit
> s'aligner exactement sur la **visibilité du listing**. Un dossier visible dans
> la liste d'un agent doit être ouvrable par cet agent — et inversement. Toute
> divergence produit un « visible en liste mais 404 au détail » (ou l'inverse,
> une fuite).

Un parcours a **deux sources de localisation** : la simulation du demandeur
(`rgaSimulationData`) et celle saisie par l'agent (`rgaSimulationDataAgent`, ex.
flux _av-add-dossier_). Deux conventions de résolution coexistent :

- **USER-first** (`getDemandeurFirstSimulation` = `rgaSimulationData ?? rgaSimulationDataAgent`) :
  utilisée pour le **filtrage territorial** (listing) et le **contrôle d'accès**.
- **AGENT-first** (`getEffectiveRGAData` = `rgaSimulationDataAgent ?? rgaSimulationData`) :
  réservée à l'**affichage** du détail (l'adresse BAN-stricte de l'agent prime)
  et aux **stats de référence**.

Le prédicat unique de territorialité est
`matchesTerritoire(getDemandeurFirstSimulation(parcours), departements, epcis)`
(union département ∪ EPCI), partagé par le listing
(`parcoursPreventionRepository.getParcoursByTerritoire`) et par le contrôle
d'accès (`verifyProspectTerritoryAccess`).

### Bug corrigé (juin 2026) — 404 sur les dossiers sans AMO

**Symptôme** : des dossiers « en attente d'AV » / « en formulaire d'éligibilité »
visibles dans le listing renvoyaient un **404** à l'ouverture, y compris pour un
`SUPER_ADMINISTRATEUR` (accès national).

**Cause principale (statut `SANS_AMO`)** : ces dossiers sont des parcours **sans
accompagnement AMO** — la validation a le statut `SANS_AMO` (responsable =
Aller-vers territorial) tout en progressant dans le parcours (éligibilité,
diagnostic…). Le routing les envoie vers `/espace-agent/dossiers/[validationId]`,
mais `STATUTS_CONSULTABLES` n'incluait que SUIVIS + REFUSES, **pas `SANS_AMO`** :
`getDossierDetail` retournait « non consultable » → `notFound()` → 404 pour tout
le monde (super-admin compris, car le filtre statut s'applique avant tout contrôle
de rôle). **Correctif** : `SANS_AMO` ajouté à `STATUTS_CONSULTABLES`
(`amo-dossiers.types.ts`). À noter : une validation `SANS_AMO` a `valideeAt = null`
(`suiviDepuis` est donc nullable).

**Cause secondaire (résolution territoriale, agents scoppés)** : indépendamment du
statut, `verifyProspectTerritoryAccess` résolvait la localisation en **AGENT-first**
(`getEffectiveRGAData`) alors que le listing filtre en **USER-first**. Quand les
deux simulations divergeaient sur le département/EPCI, un agent scoppé (AMO / AV /
hybride) voyait le dossier en liste mais était rejeté au détail. **Correctif** :
`verifyProspectTerritoryAccess` utilise désormais le même prédicat
`matchesTerritoire(getDemandeurFirstSimulation(...))` que le listing ; un agent sans
périmètre territorial (non-national) est refusé, comme dans le listing. Un rôle
national (`scope.isNational`) court-circuite ce contrôle et n'était donc pas
concerné par cette cause secondaire.

---

## 6.1 Ré-ouverture d'une demande refusée (garde élargie)

L'action « Ré-ouvrir la demande » (demande refusée par l'AMO → `en_attente`, cf.
[ADR-0016](../adr/0016-reouverture-demande-refusee.md)) utilise une garde **volontairement
plus large** que la visibilité standard : `canReopenRefusedDemande` autorise le **super-admin**
(national, exception assumée au read-only), l'**AMO de l'entreprise rattachée** et l'**Aller-vers
couvrant le territoire** — y compris quand la demande porte une AMO (cas où `canAccessDossier`
refuserait normalement l'AV). `ANALYSTE` et `ADMINISTRATEUR` sont exclus. Garde
(`reouvrirDemandeAction`) = rôle habilité **+** `canReopenRefusedDemande(scope, …)` ; l'audit
QUI/QUAND est écrit dans `parcours_actions` (type `dossier_reouvert`).

### 6.1.1 Arrêt de l'accompagnement (garde stricte, à l'inverse)

L'action « Ne plus accompagner » ([ADR-0018](../adr/0018-arret-accompagnement-amo.md))
utilise au contraire la garde **standard** `assertCanActAsResponsable` : seul l'**AMO
responsable courant** du dossier peut arrêter son propre accompagnement (`ROLES_ARRET_ACCOMPAGNEMENT`
= `AMO`, `AMO_ET_ALLERS_VERS`). `ALLERS_VERS`, `ANALYSTE`, `ADMINISTRATEUR` et le
super-admin en lecture seule sont **exclus** — contrairement à la ré-ouverture, aucun
élargissement n'est justifié ici. Même garde pour le refus d'une demande d'arrêt.

> Effet de bord : le détachement pose `entreprise_amo_id = NULL`, donc l'AMO **perd
> l'accès** au dossier juste après son action (`canAccessDossier` refuse un dossier sans
> entreprise) et l'aller-vers du territoire en devient responsable.

Côté demandeur, l'annulation n'a pas de garde de rôle : l'action résout le parcours via
`userId` de session (modèle `skipAmoStepForUser`), elle est donc scopée par construction.

## 6.2 Édition des données de simulation alignée sur le détail dossier

Le bouton « Vérifier son éligibilité » (édition du formulaire de simulation, page
`/espace-agent/edition-donnees-simulation/[id]`) doit suivre **la même règle d'accès que le
détail dossier** (§6). `getDossierSimulationData` gate donc, pour les non-admins :

- dossier **avec** entreprise AMO → **ownership entreprise** (`entrepriseAmoId` de la validation
  == celui de l'agent) ;
- dossier **sans** entreprise (statut `SANS_AMO`) → **accès territorial** via
  `verifyProspectTerritoryAccess` (Aller-vers / hybride couvrant le territoire).

Les statuts éditables incluent `SANS_AMO` (aligné sur `STATUTS_CONSULTABLES`).

> **Bug corrigé (juillet 2026) — 404 « Vérifier son éligibilité » pour un Aller-vers.** Un dossier
> `SANS_AMO` est **consultable** (le détail s'ouvre) mais l'édition de simulation n'acceptait que
> `EN_ATTENTE`/`LOGEMENT_ELIGIBLE` **et** exigeait une entreprise AMO — qu'un agent `ALLERS_VERS`
> n'a pas. Résultat : chaque dossier sans AMO renvoyait 404 sur « Vérifier son éligibilité » pour
> l'Aller-vers responsable du territoire (`editableStatuts ⊊ STATUTS_CONSULTABLES` + verrou
> entreprise). Correctif : `SANS_AMO` ajouté aux statuts éditables et bascule sur le contrôle
> **territorial** pour les dossiers sans entreprise (`edition-simulation.service.ts`).

## 7. Fichiers clés

| Rôle                             | Fichier                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Enum des rôles                   | `src/shared/domain/value-objects/user-role.enum.ts`                                                                     |
| Service de permissions           | `src/features/auth/permissions/services/permissions.service.ts`                                                         |
| Matrice permissions / onglets    | `src/features/auth/permissions/domain/value-objects/rbac-permissions.ts`                                                |
| Périmètre données agent          | `src/features/auth/permissions/services/agent-scope.service.ts`                                                         |
| Scope stats national (ADR-0017)  | `agent-scope.service.ts` (`getStatsScopeFilters`, `canViewNationalStats`)                                               |
| Projection stats anonymisée      | `src/features/backoffice/administration/demandeurs/services/users-tracking.service.ts` (`toStatsProjection`)            |
| Service RBAC (onglets)           | `src/features/auth/permissions/services/rbac.service.ts`                                                                |
| Config des routes / redirections | `src/features/auth/domain/value-objects/configs/routes.config.ts`                                                       |
| Aiguillage auth                  | `src/middleware.ts`                                                                                                     |
| Garde espace agent               | `src/app/(backoffice)/espace-agent/layout.tsx`                                                                          |
| Garde administration             | `src/app/(backoffice)/administration/page.tsx`                                                                          |
| Garde entreprise AMO             | `src/app/(backoffice)/components/AmoGuard.tsx`                                                                          |
| Garde ré-ouverture demande       | `agent-scope.service.ts` (`canReopenRefusedDemande`) + `dossiers/actions/reouvrir-demande.actions.ts`                   |
| Garde arrêt d'accompagnement     | `responsable-permissions.service.ts` (`assertCanActAsResponsable`) + `dossiers/actions/arret-accompagnement.actions.ts` |
| Garde édition simulation         | `src/features/backoffice/espace-agent/shared/services/edition-simulation.service.ts` (`getDossierSimulationData`)       |
