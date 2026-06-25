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

Inventaire généré le 2026-06-23 (audit multi-agents, 4 zones, 63 surfaces). **51
cellules négatives** recensées. Les agrégats nationaux consultables par l'`ANALYSTE`
(ADR-0014) sont exclus des gaps.

> Avancement (2026-06-23, post-traitement HIGH) : la fuite nominative est corrigée
> et **9 surfaces HIGH** désormais couvertes par des tests négatifs (détail demande
> AMO action + service, création dossier, diagnostics super-admin, garde
> `/administration`, layout espace-agent dont rejet FranceConnect, middleware,
> autres demandes archivées). Reste en **PARTIEL** : les gardes des sous-pages
> `/administration/*` (pattern `/administration` testé, à décliner) et les gardes
> _page_ super-admin synchronisations. Le garde-fou meta (§5) reste à implémenter
> pour attraper les futures `*.actions.ts` non gardées/non testées.

> Mise au point post-audit (2026-06-23) : la fuite nominative
> `getAutresDemandesArchiveesAction` est **corrigée** (scope territorial + test,
> voir ci-dessous). En revanche `getEligibiliteStatsAction` a été **sur-classé** par
> l'audit : son type de retour (`EligibiliteStats`) ne contient **que des agrégats**
> (compteurs, tranches, tops département/commune) — **aucun champ nominatif**. Elle
> tombe donc sous l'exception agrégats de l'ADR-0014 (un agrégat départemental est a
> fortiori ouvert si le national l'est) et **n'est pas une fuite**. Seule
> `getAutresDemandesArchiveesDetail` (qui renvoie `demandeur: "Prénom Nom"`, agent,
> structure AMO) exposait du nominatif non scopé.

### HIGH — PII/individuel non scopé ou DENY de route non testé

| Surface                                                                   | Fichier                                                                                        | Sensibilité | Cellules négatives                                                      | Couvert ?                                                        |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Détail demande AMO (lecture) + Accepter/Refuser (écriture)                | `espace-agent/demandes/{services/demande-detail.service.ts,actions/demande-detail.actions.ts}` | individual  | ANALYSTE → lecture SCOPE:territoire, écriture DENY ; ALLERS_VERS → DENY | OUI (action + service)                                           |
| Détail demande AMO (propriété)                                            | `espace-agent/demandes/actions/demande-detail.actions.ts:54`                                   | individual  | AMO mauvais entrepriseAmoId → SCOPE:owner                               | OUI (testé)                                                      |
| Création dossier                                                          | `espace-agent/creation-dossier/actions/create-dossier-aller-vers.action.ts`                    | individual  | ANALYSTE / SUPER_ADMIN(RO) / AMO_ET_AV(av sans allersVersId) → DENY     | OUI (testé)                                                      |
| Listing demandes AMO (page)                                               | `espace-agent/demandes/page.tsx`                                                               | individual  | ANALYSTE / ALLERS_VERS → DENY                                           | INDIRECT (wrapper : garde layout + action détail testées)        |
| Autres demandes archivées détail (nominatif)                              | `administration/tableau-de-bord/actions/tableau-de-bord.actions.ts:113`                        | individual  | ANALYSTE-départemental → SCOPE:territoire ; ANALYSTE national → DENY    | OUI (corrigé + testé)                                            |
| ~~Stats éligibilité~~ (agrégat, pas un gap)                               | `administration/tableau-de-bord/actions/tableau-de-bord.actions.ts:200`                        | aggregate   | agrégat national ouvert à l'ANALYSTE (ADR-0014) → hors gaps             | N/A                                                              |
| Diagnostics List/Detail                                                   | `administration/diagnostics/actions/diagnostics.actions.ts`                                    | individual  | ADMINISTRATEUR / ANALYSTE / non-auth → DENY                             | OUI (testé)                                                      |
| Route /administration (guard)                                             | `app/(backoffice)/administration/page.tsx`                                                     | none        | non-auth / PARTICULIER / AMO / ALLERS_VERS / AMO_ET_AV → DENY           | OUI (testé)                                                      |
| Routes admin (agents/commentaires/amo/allers-vers/acquisition/demandeurs) | `app/(backoffice)/administration/*/page.tsx`                                                   | none        | ANALYSTE/ADMINISTRATEUR/AMO selon page → DENY                           | PARTIEL (pattern /administration testé ; sous-pages à compléter) |
| Routes super-admin (synchronisations/diagnostics) guard                   | `app/(backoffice)/administration/{synchronisations,diagnostics}/page.tsx`                      | none        | ADMINISTRATEUR / ANALYSTE → DENY                                        | PARTIEL (actions diagnostics testées ; gardes page à compléter)  |
| EspaceAgent Layout — rejet FranceConnect                                  | `app/(backoffice)/espace-agent/layout.tsx`                                                     | individual  | FranceConnect (mauvaise méthode) → DENY                                 | OUI (testé)                                                      |
| Middleware auth & redirection                                             | `src/middleware.ts`                                                                            | none        | AMO→/espace-amo ; non-auth→/connexion/agent → DENY                      | OUI (testé)                                                      |
| Ré-ouverture demande refusée                                              | `dossiers/actions/reouvrir-demande.actions.ts`                                                 | individual  | ANALYSTE / non-auth / AMO autre entreprise / AV hors territoire → DENY  | OUI (action + prédicat `canReopenRefusedDemande`)                |

### MEDIUM — scope individuel partiel / DENY admin partiel

| Surface                                           | Fichier                                                           | Sensibilité | Cellules négatives                          | Couvert ?           |
| ------------------------------------------------- | ----------------------------------------------------------------- | ----------- | ------------------------------------------- | ------------------- |
| Accepter/Refuser accompagnement (lecture seule)   | `espace-agent/demandes/actions/demande-detail.actions.ts:79`      | individual  | SUPER_ADMINISTRATEUR → DENY (RO)            | OUI (testé)         |
| Commentaires create/update/delete (lecture seule) | `espace-agent/shared/actions/dossier-actions.actions.ts:45`       | individual  | SUPER_ADMINISTRATEUR → DENY (RO)            | PARTIEL (générique) |
| Agents CRUD                                       | `administration/agents/actions/agents.actions.ts`                 | individual  | PARTICULIER → DENY                          | NON                 |
| AMO CRUD                                          | `administration/amo/actions/amo-admin.actions.ts`                 | aggregate   | non-authentifié → DENY                      | NON                 |
| Allers-Vers CRUD                                  | `administration/allers-vers/actions/allers-vers-admin.actions.ts` | aggregate   | ANALYSTE / ALLERS_VERS / AMO → DENY         | PARTIEL             |
| Synchronisations List/Trigger                     | `administration/synchronisations/actions/sync-runs.actions.ts`    | aggregate   | ADMINISTRATEUR / ANALYSTE / non-auth → DENY | NON                 |
| AmoGuard — entreprise non configurée              | `app/(backoffice)/components/AmoGuard.tsx`                        | individual  | AMO / AMO_ET_AV sans entrepriseAmoId → DENY | NON                 |

### Cellules négatives déjà couvertes (référence)

`get-nombre-dossiers.action.test.ts` (analyste national → 0), `get-amo-statistiques.action.test.ts`
(AMO sans entreprise → DENY), `AgentNavigation.test.tsx`, `rbac.service.test.ts`,
`users-tracking.actions.test.ts` (+ scope territoire), `agents.actions.test.ts`,
`amo-admin.actions.test.ts`, `get-statistiques.action.test.ts`, `espace-agent/page.test.ts`.

Ajoutés le 2026-06-23 (traitement HIGH) : `tableau-de-bord.actions.test.ts` (fuite
nominative scopée : admin national / analyste départemental / analyste national → vide),
`demande-detail.actions.test.ts` (+ cas ANALYSTE/ALLERS_VERS/owner/super-admin RO),
`demande-detail.service.test.ts` (garde de lecture), `create-dossier-aller-vers.action.test.ts`,
`diagnostics.actions.test.ts` (réservé super-admin), `espace-agent/layout.test.tsx`
(rejet FranceConnect + rôles), `administration/page.test.tsx` (garde de route),
`middleware.test.ts` (redirection non-auth + AMO hors `/administration`).
