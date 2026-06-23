# Plan de couverture RBAC — anti-fuite / anti-accès non désiré

Méthode pour identifier et garantir, **rôle par rôle**, qu'aucune surface n'expose
de données hors périmètre ni n'autorise un accès non souhaité.

> À relire/dérouler à chaque évolution touchant aux rôles, aux gardes de route, au
> scope de données ou à une nouvelle Server Action lisant des données protégées.
> Voir aussi [RBAC-ROLES.md](RBAC-ROLES.md) et [ADR-0014](../adr/0014-perimetre-donnees-role-analyste.md).

Constat fondateur : les fuites observées (demandeurs au national pour un analyste
départemental, compteur de dossiers non scopé, barre d'onglets débordant sur
`/administration`) vivaient toutes sur des surfaces **non testées en négatif**.
L'objectif est de rendre cet angle mort systématique.

---

## 1. Profils à tester explicitement

| Profil                   | Particularité                                    |
| ------------------------ | ------------------------------------------------ |
| Non authentifié          | Doit être redirigé vers la connexion             |
| Mauvaise méthode d'auth  | FranceConnect sur route agent (et inversement)   |
| `PARTICULIER`            | Son propre parcours uniquement                   |
| `SUPER_ADMINISTRATEUR`   | Accès global (lecture en espace agent)           |
| `ADMINISTRATEUR`         | Back-office complet sauf agents                  |
| `ANALYSTE` national      | Stats nationales, **aucune donnée individuelle** |
| `ANALYSTE` départemental | Données individuelles **scopées au territoire**  |
| `AMO`                    | Son entreprise AMO                               |
| `ALLERS_VERS`            | Dossiers sans AMO de son territoire              |
| `AMO_ET_ALLERS_VERS`     | Union entreprise AMO + territoire                |

---

## 2. Légende des verdicts attendus (par cellule rôle × surface)

- `ALLOW` — accès plein autorisé.
- `DENY` — doit être refusé (403 / redirection / liste vide).
- `SCOPE:territoire` — autorisé mais filtré aux départements/EPCI de l'agent.
- `SCOPE:entreprise` — autorisé mais filtré à l'entreprise AMO.
- `SCOPE:owner` — autorisé seulement si l'agent est propriétaire de la ressource
  (ex. éligibilité gardée par `verifyAmoOwnership`).

Les cellules **négatives** (`DENY` / `SCOPE:*`) sont la cible du plan : c'est là que
naissent les fuites.

---

## 3. Étapes

### Étape 1 — Inventaire de la surface d'accès

Recenser mécaniquement les points d'entrée lisant/écrivant des données protégées :

- Server actions : `rg -l "use server" src` → chaque `*.actions.ts`.
- Gardes de route : `layout.tsx` / `page.tsx` sous `src/app/(backoffice)`,
  `src/middleware.ts`, `AmoGuard`.
- Services scopés : appels à `calculateAgentScope`, `getScopeFilters`,
  `verifyProspectTerritoryAccess`, `verifyAmoOwnership`.
- Composants nav/menu conditionnés au rôle : `AgentNavigation`, `AdminNavigation`,
  `Header`.

Classer chaque surface par **sensibilité de la donnée exposée** :
`PII/individuelle > dossier > agrégat > aucune`.

### Étape 2 — Matrice `rôle × surface × attendu`

Pour chaque surface, fixer le verdict attendu (§2) pour chacun des profils (§1).

### Étape 3 — Confrontation à la couverture existante

Pour chaque cellule, repérer un test existant (`rg -l "<garde>" --glob '*.test.ts'`)
et marquer **couverte / non couverte**. Les cellules **négatives non couvertes** =
backlog prioritaire.

---

## 4. Patterns de test (3 niveaux)

1. **Contrat RBAC table-driven** (par surface) : test paramétré bouclant sur tous les
   profils, assertant `ALLOW` / `DENY`. Mock de session/rôle (`createMockAuthUser`).
   Couvre rapidement les cellules `DENY`.
2. **Filtrage de scope** (par service de données) : asserter que les lignes hors
   périmètre sont exclues (cf. `users-tracking.service.test.ts`,
   `agent-scope.service.test.ts`). Couvre les cellules `SCOPE:*`.
3. **Cohérence listing ↔ détail** (par ressource) : « visible en liste ⇔ ouvrable au
   détail » via le même prédicat `matchesTerritoire` (cf. RBAC-ROLES §6).

---

## 5. Garde-fou anti-régression

Une nouvelle surface non testée = fuite potentielle. Ajouter un **test méta** qui
échoue si une `*.actions.ts` lisant des données ne présente ni garde reconnue
(`checkBackofficePermission` / `verifyProspectTerritoryAccess` / `verifyAmoOwnership`)
ni test d'accès associé. Heuristique imparfaite mais qui attrape les oublis.

---

## 6. Priorisation

1. Surfaces **PII / individuelles** non scopées (demandeurs, dossiers, détail,
   exports) — gravité maximale.
2. Cellules `DENY` de route (un rôle atteignant une page interdite).
3. Agrégats — gravité moindre (cf. [ADR-0014](../adr/0014-perimetre-donnees-role-analyste.md) :
   les agrégats nationaux sont assumés pour l'analyste).

---

## 7. Matrice de couverture (générée)

> Section alimentée par l'inventaire automatisé (cf. §3). Liste les surfaces, leur
> verdict attendu par rôle, et les cellules non couvertes à traiter.

_(À compléter par l'exécution de l'inventaire.)_
