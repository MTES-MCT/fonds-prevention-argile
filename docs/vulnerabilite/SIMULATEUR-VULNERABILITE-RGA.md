# Simulateur de vulnérabilité RGA

Document de référence du second simulateur public (`/vulnerabilite-rga`) : périmètre, disponibilité
par environnement, architecture, méthode de calcul, et **backlog des améliorations à faire** avant
d'envisager une mise en production.

> À lire avant toute évolution de la feature `src/features/vulnerabilite-rga/`, de l'onglet
> `/administration/vulnerabilite` ou de la carte « Vulnérabilité au RGA » de l'espace agent.
> Décisions structurantes : [ADR-0030](../adr/0030-simulateur-vulnerabilite-rga.md) (architecture),
> [ADR-0031](../adr/0031-stats-vulnerabilite-matomo-bdd.md) (stats),
> [ADR-0032](../adr/0032-rattachement-simulation-vulnerabilite-compte.md) (rattachement au compte).

---

## 1. Objectif et périmètre

Sensibiliser le grand public au risque de retrait-gonflement des argiles à partir du **seul
environnement proche de la maison**, expliquer les bonnes pratiques et déclencher des actions à
moindre coût. Ce n'est **pas** un diagnostic, et ce n'est **pas** le simulateur d'éligibilité :

|                | `/simulateur` (éligibilité)                      | `/vulnerabilite-rga` (vulnérabilité)                  |
| -------------- | ------------------------------------------------ | ----------------------------------------------------- |
| Question posée | « Ai-je droit au Fonds ? »                       | « Qu'est-ce qui fragilise ma maison, et que faire ? » |
| Sortie         | éligible / non éligible, entrée dans le parcours | score 0-100 + recommandations priorisées              |
| Sujet          | logement, revenus, aléa                          | environnement proche : eaux, végétation, exposition   |
| Compte requis  | oui à terme (FranceConnect)                      | non, jamais                                           |

Le questionnaire ne porte volontairement **ni sur le bâti** (année, niveaux, fondations) **ni sur les
revenus** : 11 questions, toutes observables depuis le jardin.

---

## 2. Disponibilité par environnement

**La feature n'est pas déployée en production.** Sa grille de pondération n'est pas validée par un
expert RGA : publier un score de vulnérabilité non validé engagerait le produit sur une méthode
qu'il ne peut pas défendre.

Bascule unique : `isVulnerabiliteRgaActive()`
(`domain/value-objects/vulnerabilite-disponibilite.ts`), dérivée de `NEXT_PUBLIC_APP_ENV` —
actif en `local`, `docker` et `staging`, **inactif en `production`**.

| Surface                                       | Comportement quand inactif                                               |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `/vulnerabilite-rga`                          | 404                                                                      |
| `/embed-vulnerabilite-rga`                    | 404                                                                      |
| `/administration/vulnerabilite`               | 404                                                                      |
| Onglet « Vulnérabilité » de la nav backoffice | masqué (`AdminNavTab.estDisponible`)                                     |
| `enregistrerResultatVulnerabiliteAction`      | no-op — une Server Action reste appelable même quand sa page renvoie 404 |

> La carte « Vulnérabilité au RGA » de l'espace agent n'est pas gardée : elle ne s'affiche que si
> une simulation est rattachée au parcours, ce qui ne peut pas arriver en production tant que
> l'écriture est bloquée.

**Pour la mettre en ligne**, trois choses à faire ensemble, jamais séparément :

1. faire valider la grille (`grille-ponderation.ts` + `ESSENCES_AGRESSIVITE`) par l'expert RGA ;
2. basculer `isVulnerabiliteRgaActive()` ;
3. retirer le `noindex` des deux pages **et** les entrées correspondantes de `src/app/robots.ts`.

---

## 3. Architecture

Feature DDD-lite autonome, sans dépendance vers `features/simulateur` (cf. ADR-0030) — seules les
briques déjà génériques sont réutilisées telles quelles : `shared/adapters/ban`,
`shared/services/bdnb`, `features/rga-map`, route `/api/rga/alea`.

```
domain/
  value-objects/grille-ponderation.ts      ← LA méthode (poids + barèmes). Seul fichier à ajuster.
  value-objects/simulation-payload.ts      ← charge utile + validation Zod, dérivée de la grille
  value-objects/vulnerabilite-critere-fields.ts  ← critère ↔ colonne DB ↔ réponse aplatie
  value-objects/vulnerabilite-disponibilite.ts   ← bascule d'environnement
  services/scoring.service.ts              ← calcul du score (aucun chiffre métier, sauf les seuils)
  services/recommandations.service.ts      ← priorisation `poidsGlobal × score`
  catalogues/recommandations.catalogue.ts  ← fiches conseil, par critère et réponse déclenchante
  rules/navigation/step-flow.rules.ts      ← ordre des étapes + branchement arbre → essence
stores/vulnerabilite.store.ts              ← Zustand + sessionStorage (pas de localStorage)
components/                                ← 13 étapes, 9 schémas SVG, jauge, recommandations
actions/enregistrer-resultat.actions.ts    ← écriture anonyme (best-effort)
```

### Parcours

`intro → adresse → 4 questions eaux → arbre (+ essence si arbre proche) → haies → végétation en
pied de façade → mitoyenneté → ensoleillement → résultat`

Seule bifurcation : `arbre_essence` n'est posée que si `arbre_proximite === "oui"`. Le compteur
d'étapes passe donc de 10 à 11 selon la réponse.

### Calcul du score

Deux niveaux de pondération, tous deux dans `grille-ponderation.ts` :

- **catégorie** dans le score global — sol 30, eaux 25, végétation 25, divers 20 ;
- **critère** dans sa catégorie — la somme fait 100 par catégorie (vérifié par test).

Chaque réponse vaut un score 0 (idéal) à 100 (risque maximal). Le score global est une moyenne
pondérée **renormalisée** : un critère non répondu ou non applicable est exclu du dénominateur,
jamais compté comme « bon ».

La catégorie `sol` (aléa RGA) est marquée `actionnable: false` : elle pèse dans le score mais ne
génère **jamais** de recommandation — on ne demande pas à un ménage de changer son sol.

---

## 4. Enregistrement et statistiques

Chaque simulation terminée écrit une ligne dans `vulnerabilite_simulations` — table **strictement
anonyme** : pas de FK `users`, pas d'adresse, pas de commune, pas de coordonnées, pas
d'identifiant de visiteur. Seuls le code département, les réponses et les scores.

Deux garde-fous, parce que la page est publique et non authentifiée :

- le navigateur n'envoie qu'une charge utile réduite (`toSimulationPayload`) — l'adresse, les
  coordonnées, la clé BAN et l'identifiant RNB **ne quittent jamais le navigateur** ;
- le serveur valide chaque réponse contre la grille et **recalcule le score** : rien de ce que le
  client affirme n'entre dans les stats de calibrage.

Répartition Matomo / BDD (ADR-0031) : Matomo pour le volume, le funnel et la répartition par
département ; la table pour la répartition par réponse et le score moyen, que Matomo ne sait pas
agréger. Onglet `/administration/vulnerabilite`, ouvert à tous les agents (agrégats non nominatifs,
même logique qu'ADR-0017).

---

## 5. Rattachement au compte demandeur

Si le demandeur est connecté au moment du résultat, `parcours_prevention.vulnerabilite_simulation_id`
est posé immédiatement. Sinon, un cookie httpOnly (1 h) porte l'identifiant, consommé à la connexion
dans `handleFranceConnectCallback` (mirror de `FC_CLAIM_TOKEN`). Détail : ADR-0032.

> **Limite connue — l'iframe.** Depuis `/embed-vulnerabilite-rga`, le contexte est cross-site : le
> cookie `sameSite: lax` n'est pas posé et la session n'est pas visible. Le rattachement ne
> fonctionne donc **pas** sur la route embarquable, silencieusement. Le simulateur d'éligibilité
> contourne cela par une navigation first-party (`/connexion?partner=`, cf.
> [PARTNER-TRACKING.md](../partners/PARTNER-TRACKING.md)) ; à reprendre si le rattachement doit
> marcher côté partenaires.

---

## 6. Améliorations à faire

Priorisé. Les points bloquants pour une mise en production sont marqués **P0**.

### Méthode et contenu

- **P0 — Faire valider la grille par un expert RGA.** `CATEGORIES_CONFIG`, `CRITERES_CONFIG` et
  `ESSENCES_AGRESSIVITE` sont des valeurs de départ assumées, pas une méthode. Tant que ce point
  n'est pas levé, le reste de cette liste est secondaire.
- **P0 — Remplacer `ESSENCES_AGRESSIVITE`** par la table d'agressivité définitive (bloc isolé,
  aucun autre fichier à toucher).
- Trou de contenu : `arbre_proximite = "ne_sais_pas"` vaut 50 mais ne déclenche aucune fiche du
  catalogue — l'utilisateur est pénalisé sans piste d'action. Ajouter une fiche « faire identifier
  l'arbre / mesurer la distance aux fondations ».
- Vérifier avec le métier la décision « gravier de propreté présent = risque maximal » et
  « végétation en pied de façade = à supprimer d'office », aujourd'hui binaires.

### Cohérence produit

- Le badge des cartes de recommandation affiche « Gain potentiel » à partir du **score de la
  réponse**, alors que la liste est triée par `poidsGlobal × score`. Deux recommandations de même
  score mais de poids différents affichent donc le même gain. Aucune inversion visible avec la
  grille actuelle, mais l'incohérence deviendra visible dès que les poids bougeront : badger sur la
  priorité normalisée, ou renommer le libellé.
- Les bandes de la jauge (5 × 36°, coupures à 20/40/60/80) ne correspondent pas aux seuils de
  niveau (25/50/75) : un score de 45 est annoncé « modérée » avec l'aiguille dans la bande du
  milieu. Passer à 4 bandes alignées sur les vrais seuils.
- Une seconde simulation dans la même session écrase le pointeur du parcours (dernière simulation
  connue). Voulu, mais à revoir si l'espace agent doit un jour montrer une évolution dans le temps.

### Technique

- Déplacer `SEUILS_NIVEAU` (25/50/75) de `scoring.service.ts` vers la grille : ces seuils font
  partie de la méthode, ils pilotent la jauge et tous les badges.
- Supprimer le cas particulier `arbre_essence` (`bareme: []` + `if (critere.id === "arbre_essence")`
  dans `scoring.service.ts`, `getReponseLabel` et `simulation-payload.ts`) en générant son barème
  depuis `ESSENCES_AGRESSIVITE` au chargement du module.
- `getPreviousStep` et `canGoToStep` (`step-flow.rules.ts`) ne sont appelés que par leurs propres
  tests : la navigation arrière passe par `history`. Du code mort qui a l'air couvert.
- Remplacer les couleurs en dur d'`ImpactBadge` et `VulnerabiliteGauge` par les classes/variables
  DSFR (`fr-badge--success/warning/error`, `--background-contrast-*`) pour suivre le thème sombre.
- `ETAPES_NUMEROTEES_BASE` (`vulnerabilite-step.enum.ts`) duplique volontairement l'ordre et la
  règle de branchement de `step-flow.rules.ts` : à dériver si une seconde question conditionnelle
  apparaît.
- Ajouter un test négatif RBAC sur les trois Server Actions de `vulnerabilite-stats.actions.ts`
  (cf. [RBAC-TEST-PLAN §5](../security/RBAC-TEST-PLAN.md)) — gravité faible (agrégats anonymes),
  mais c'est la règle du repo pour toute nouvelle surface.
- Ajouter `NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE` à `.env.example` (aujourd'hui documentée
  seulement dans ADR-0031), et créer le funnel correspondant côté Matomo.
- Pas de limitation de débit sur l'écriture anonyme : acceptable hors production, à traiter si la
  feature est mise en ligne (l'endpoint est public et non authentifié).

---

## 7. Fichiers clés

| Rôle                                         | Fichier                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Méthode de calcul (poids, barèmes, essences) | `vulnerabilite-rga/domain/value-objects/grille-ponderation.ts`                                |
| Bascule d'environnement                      | `vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite.ts`                       |
| Charge utile + validation Zod                | `vulnerabilite-rga/domain/value-objects/simulation-payload.ts`                                |
| Calcul du score                              | `vulnerabilite-rga/domain/services/scoring.service.ts`                                        |
| Priorisation des recommandations             | `vulnerabilite-rga/domain/services/recommandations.service.ts`                                |
| Navigation et branchement                    | `vulnerabilite-rga/domain/rules/navigation/step-flow.rules.ts`                                |
| Orchestrateur des 13 étapes                  | `vulnerabilite-rga/components/VulnerabiliteFormulaire.tsx`                                    |
| Écriture anonyme                             | `vulnerabilite-rga/actions/enregistrer-resultat.actions.ts`                                   |
| Table anonyme                                | `shared/database/schema/vulnerabilite-simulations.ts`                                         |
| Rattachement à la connexion                  | `auth/adapters/franceconnect/franceconnect.service.ts` (`lierSimulationVulnerabiliteAnonyme`) |
| Stats back-office                            | `backoffice/administration/vulnerabilite/services/vulnerabilite-stats.service.ts`             |
| Carte espace agent                           | `backoffice/espace-agent/shared/services/build-info-vulnerabilite.service.ts`                 |
