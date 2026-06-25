# ADR-0015 : Navigation backoffice unifiée (deux rangées pilotées par rôle, pas par URL)

**Date** : 2026-06-23
**Statut** : Accepté

## Contexte

Le backoffice est composé de deux espaces physiquement séparés, chacun avec son
layout, sa garde et sa propre barre d'onglets horizontale :

- `/administration/*` — barre `AdminNavigation`, onglets `ADMIN_NAV_TABS` (Tableau de
  bord, Acquisition, Demandeurs, Agents, AMO, Allers Vers, Notes, Synchros,
  Diagnostics DN), filtrés par `minRoles`.
- `/espace-agent/*` — barre `AgentNavigation`, onglets `AGENT_TABS` (Dossiers,
  Statistiques).

Les deux barres sont montées dans le `Header` mais **chacune s'auto-masque selon
l'URL** : `AdminNavigation` rend `null` sur `/espace-agent`, `AgentNavigation` rend
`null` hors `/espace-agent`. À tout instant, une seule barre est visible. Le seul
moyen de passer d'un espace à l'autre est un bouton discret en haut à droite
(« Administration » / « Vue espace agent »), réservé à `SUPER_ADMINISTRATEUR` et
`ANALYSTE`.

Problème UX remonté : depuis `/administration`, l'onglet « Dossiers » n'existe nulle
part dans la barre. Pour consulter les dossiers, un super-admin ou un analyste
départemental doit repérer le bouton « Vue espace agent », qui **remplace toute la
barre**. Le modèle mental est fragmenté ; l'accès aux dossiers est caché derrière un
changement d'espace non évident.

Les rôles mono-espace ne sont pas concernés : AMO / Allers-Vers / hybride atterrissent
directement dans `/espace-agent` (un seul espace) ; `ADMINISTRATEUR` n'a pas accès à
l'espace agent (aucun dossier individuel). Le sujet ne touche que les rôles
**bi-espaces** : `SUPER_ADMINISTRATEUR` et `ANALYSTE` départemental.

## Décision

> Nous remplaçons les deux barres auto-masquées par une **navigation backoffice
> unifiée** affichée sur **deux rangées empilées**, dont la visibilité est pilotée
> par le **rôle** (capacités d'accès) et non plus par l'URL courante.

- **Rangée 1 — Pilotage** : les onglets d'administration (`ADMIN_NAV_TABS`, filtrage
  `minRoles` inchangé). Visible si l'utilisateur a accès à l'administration.
- **Rangée 2 — Suivi des dossiers** : les onglets de l'espace agent (Dossiers,
  Statistiques). Visible si l'utilisateur a accès à l'espace agent.

Les deux rangées restent visibles **simultanément** dans tout le backoffice pour les
rôles bi-espaces, quelle que soit la sous-route. Le bouton de bascule « Vue espace
agent » devient redondant et est **retiré**.

Pour décider de la rangée 2 côté client, on introduit deux booléens calculés
**côté serveur** et exposés via `/api/auth/check` : `canAccessAdministration` et
`canAccessEspaceAgent`. Le second tranche le cas `ANALYSTE` départemental (avec
départements) vs national (sans) — distinction qui vit en base, pas dans le rôle.

Garde-fous conservés :

- **Garde de chemin** : la barre ne rend que sur les préfixes backoffice
  (`/administration` ∪ `/espace-agent`). Le `Header` étant partagé avec le site
  public `(main)`, cela évite que la navigation backoffice ne fuite sur les pages
  publiques.
- **La navigation n'est qu'un affichage** : la vraie barrière reste les gardes de
  `layout.tsx` / `page.tsx` et des Server Actions (cf. RBAC-ROLES, RBAC-TEST-PLAN).
  Masquer/montrer un onglet ne change aucune autorisation.

### Matrice d'affichage par rôle

Rangée 1 = Pilotage (`/administration`), Rangée 2 = Suivi des dossiers
(`/espace-agent`). « — » = rangée non affichée.

| Rôle                     | Rangée 1 — Pilotage                                                                                 | Rangée 2 — Dossiers    |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------- |
| `SUPER_ADMINISTRATEUR`   | Tableau de bord, Acquisition, Demandeurs, Agents, AMO, Allers Vers, Notes, Synchros, Diagnostics DN | Dossiers, Statistiques |
| `ADMINISTRATEUR`         | Tableau de bord, Acquisition, Demandeurs, AMO, Allers Vers                                          | —                      |
| `ANALYSTE` national      | Tableau de bord, Acquisition, Demandeurs                                                            | —                      |
| `ANALYSTE` départemental | Tableau de bord, Acquisition, Demandeurs                                                            | Dossiers (sans Stats)  |
| `AMO`                    | —                                                                                                   | Dossiers, Statistiques |
| `ALLERS_VERS`            | —                                                                                                   | Dossiers, Statistiques |
| `AMO_ET_ALLERS_VERS`     | —                                                                                                   | Dossiers, Statistiques |

Règles dérivées :

- **`canAccessAdministration`** = rôle ∈ { `SUPER_ADMINISTRATEUR`, `ADMINISTRATEUR`,
  `ANALYSTE` } (national comme départemental). La rangée 1 réutilise le filtrage
  `minRoles` existant par onglet — aucun changement de visibilité par onglet.
- **`canAccessEspaceAgent`** = rôle ∈ { `SUPER_ADMINISTRATEUR`, `AMO`, `ALLERS_VERS`,
  `AMO_ET_ALLERS_VERS` } **ou** (`ANALYSTE` **et** au moins un département). Aligné
  exactement sur la garde du layout `espace-agent`.
- **Statistiques** masqué pour `ANALYSTE` (l'onglet est AMO-centré ; ses stats vivent
  dans `/administration`), comportement déjà en place dans `AgentNavigation`.
- L'`ANALYSTE` national ne voit **jamais** la rangée 2 : sans le flag serveur, un clic
  sur « Dossiers » le ferait rediriger vers `/administration` par la garde du layout —
  une navigation qui « ment ». Le flag évite cet écueil.

## Options envisagées

### Option A — Deux rangées empilées, pilotées par rôle (retenue)

- Avantages : « Dossiers » toujours visible pour qui y a droit ; un seul modèle
  mental ; supprime le bouton-bascule caché ; conserve le regroupement logique
  (pilotage vs dossiers) ; réutilise les configs et le filtrage `minRoles` existants ;
  changement purement présentation (aucune route ni garde touchée).
- Inconvénients : nécessite un flag serveur (`canAccessEspaceAgent`) pour distinguer
  l'analyste départemental du national ; deux rangées ajoutent du poids visuel pour le
  super-admin (jusqu'à 9 + 2 onglets).

### Option B — Fusionner en une seule rangée

- Avantages : encore plus compact conceptuellement.
- Inconvénients : le super-admin cumulerait ~11 onglets sur une seule ligne →
  débordement / repli illisible. Mélange « gestion » et « consultation de dossiers »
  sans hiérarchie. Écarté.

### Option C — Injecter un seul onglet « Dossiers » dans la barre admin

- Avantages : changement minimal, résout le clic caché.
- Inconvénients : asymétrie déroutante — cliquer « Dossiers » fait disparaître la barre
  admin et apparaître la barre agent (on reste dans le modèle « une seule barre à la
  fois »). Ne corrige pas le fond. Écarté.

## Conséquences

### Positives

- Accès direct aux dossiers depuis n'importe quelle page du backoffice pour les rôles
  habilités, sans bascule d'espace.
- Visibilité de navigation désormais déterministe et testable par rôle (table-driven),
  cohérente avec l'approche RBAC-TEST-PLAN.
- Suppression d'un élément d'UI ambigu (bouton « Vue espace agent »).

### Négatives / Risques

- Le flag `canAccessEspaceAgent` ajoute un calcul serveur (lecture des départements de
  l'analyste) dans `/api/auth/check`. Coût négligeable (déjà un appel agent), mais c'est
  une donnée de plus à garder cohérente avec la garde du layout — toute divergence
  reproduirait le bug « nav qui ment ».
- Deux rangées augmentent la hauteur du header en backoffice (desktop). Sur mobile, le
  menu reste le modal existant, à compléter avec les liens dossiers pour les rôles
  bi-espaces.

### Migration

1. Ajouter `canAccessAdministration` / `canAccessEspaceAgent` à la réponse
   `/api/auth/check` (ProConnect) et au type `AuthUser`, calculés côté serveur
   (analyste départemental résolu via `agentPermissionsRepository`).
2. Créer `BackofficeNavigation` rendant les deux rangées empilées (garde de chemin
   backoffice + gardes de rôle), avec détection d'onglet actif sur les deux préfixes.
3. Câbler `BackofficeNavigation` dans le `Header` à la place de `AgentNavigation` +
   `AdminNavigation` ; retirer le bouton « Vue espace agent » (desktop et mobile) ;
   exposer les liens dossiers dans le modal mobile pour les rôles bi-espaces.
4. Tests table-driven : la rangée 2 n'apparaît pas pour `ADMINISTRATEUR` ni `ANALYSTE`
   national, apparaît pour `SUPER_ADMINISTRATEUR` / `ANALYSTE` départemental / AMO / AV.

## Liens

- Navigation : `src/shared/components/Header/Header.tsx`,
  `src/shared/components/AdminNavigation/AdminNavigation.tsx`,
  `src/shared/components/AgentNavigation/AgentNavigation.tsx`
- Configs onglets : `src/features/backoffice/administration/shared/domain/value-objects/admin-nav.config.ts`,
  `src/features/backoffice/espace-agent/shared/domain/value-objects/amo-tabs.config.ts`
- Auth : `src/app/api/auth/check/route.ts`, `src/features/auth/domain/entities/`,
  `src/features/auth/contexts/AuthContext.tsx`, `src/features/auth/hooks/useRoles.ts`
- Gardes : `src/app/(backoffice)/espace-agent/layout.tsx`,
  `src/app/(backoffice)/administration/page.tsx`
- Contexte RBAC : `docs/security/RBAC-ROLES.md` (§3 rôle → espace)
