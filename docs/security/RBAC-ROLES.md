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

| Rôle                   | Catégorie | Résumé                                                           |
| ---------------------- | --------- | ---------------------------------------------------------------- |
| `PARTICULIER`          | Demandeur | Propriétaire authentifié FranceConnect, suit son propre parcours |
| `SUPER_ADMINISTRATEUR` | Admin     | Accès total (toutes permissions)                                 |
| `ADMINISTRATEUR`       | Admin     | Back-office complet sauf gestion des agents                      |
| `ANALYSTE`             | Agent     | Statistiques, national ou par département selon affectation      |
| `ANALYSTE_DDT`         | Agent     | Statistiques restreintes à ses départements (jamais national)    |
| `AMO`                  | Agent     | Dossiers de son entreprise AMO                                   |
| `ALLERS_VERS`          | Agent     | Prospects de son territoire (dossiers sans AMO)                  |
| `AMO_ET_ALLERS_VERS`   | Agent     | Cumul AMO + Allers-Vers (union des périmètres)                   |

Helpers : `isAgentRole`, `isAdminRole`, `isSuperAdminRole`, `isValidRole`.
Groupes : `ADMIN_ROLES` (super-admin + admin), `AGENT_ROLES` (tous sauf
`PARTICULIER`).

---

## 3. Rôle → espace accessible

Deux grands espaces back-office, gardés au niveau des `layout.tsx` / `page.tsx`.

| Espace / route                                  | Rôles autorisés                                                      | Espace de repli                    |
| ----------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| `/mon-compte`, `/mes-dossiers`, `/mes-demandes` | `PARTICULIER` (FranceConnect)                                        | `/connexion`                       |
| `/administration/*`                             | `SUPER_ADMINISTRATEUR`, `ADMINISTRATEUR`, `ANALYSTE`, `ANALYSTE_DDT` | AMO/AV → `/espace-agent`           |
| `/espace-agent/*`                               | `AMO`, `ALLERS_VERS`, `AMO_ET_ALLERS_VERS`, `SUPER_ADMINISTRATEUR`   | admin/analyste → `/administration` |

Redirection par défaut après connexion (selon rôle) : admins/analystes →
`/administration` ; AMO/AV → `/espace-agent` ; particulier → `/mon-compte`.

Gardes principales :

- Espace agent : `src/app/(backoffice)/espace-agent/layout.tsx`
  (`checkProConnectAccess` + `getCurrentAgent` + `checkRoleAccess([...])`).
- Administration : `src/app/(backoffice)/administration/page.tsx`
  (`checkAgentAccess` puis redirection des AMO/AV).
- Garde entreprise AMO : `src/app/(backoffice)/components/AmoGuard.tsx` — bloque
  un `AMO` / `AMO_ET_ALLERS_VERS` sans entreprise rattachée.
- Routes : `src/features/auth/domain/value-objects/configs/routes.config.ts`.

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
- **ANALYSTE / ANALYSTE_DDT** : lecture stats uniquement (voir §5 pour le périmètre).
- **AMO** : dossiers AMO (lecture + stats), création de dossier, commentaires
  (création + édition/suppression des siens).
- **ALLERS_VERS** : prospects (vue + détail + stats), création de dossier,
  commentaires.
- **AMO_ET_ALLERS_VERS** : union AMO + Allers-Vers.

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
| ANALYSTE            | non       | non                | non               | national si aucun dept affecté, sinon ses depts |
| ANALYSTE_DDT        | non       | non                | non               | ses départements (jamais national)              |

Distinctions clés :

- **ANALYSTE vs ANALYSTE_DDT** : un `ANALYSTE` sans département affecté voit les
  stats nationales ; un `ANALYSTE_DDT` est toujours restreint à ses départements.
- **ALLERS_VERS vs AMO_ET_ALLERS_VERS** : l'allers-vers seul ne voit que les
  dossiers sans AMO de son territoire ; la version fusionnée cumule aussi les
  dossiers de son entreprise AMO. La version fusionnée requiert une entreprise AMO
  ET un identifiant allers-vers.

---

## 6. Fichiers clés

| Rôle                             | Fichier                                                                  |
| -------------------------------- | ------------------------------------------------------------------------ |
| Enum des rôles                   | `src/shared/domain/value-objects/user-role.enum.ts`                      |
| Service de permissions           | `src/features/auth/permissions/services/permissions.service.ts`          |
| Matrice permissions / onglets    | `src/features/auth/permissions/domain/value-objects/rbac-permissions.ts` |
| Périmètre données agent          | `src/features/auth/permissions/services/agent-scope.service.ts`          |
| Service RBAC (onglets)           | `src/features/auth/permissions/services/rbac.service.ts`                 |
| Config des routes / redirections | `src/features/auth/domain/value-objects/configs/routes.config.ts`        |
| Aiguillage auth                  | `src/middleware.ts`                                                      |
| Garde espace agent               | `src/app/(backoffice)/espace-agent/layout.tsx`                           |
| Garde administration             | `src/app/(backoffice)/administration/page.tsx`                           |
| Garde entreprise AMO             | `src/app/(backoffice)/components/AmoGuard.tsx`                           |
