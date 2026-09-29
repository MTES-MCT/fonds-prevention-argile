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
revenus** : 12 questions, toutes observables depuis le jardin.

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

> **Liste d'autorisation, pas de refus de la production.** Le lecteur d'environnement partagé
> applique un défaut "local" quand la variable est absente : une app mal configurée servirait
> alors le simulateur. La bascule teste donc l'appartenance à la liste ci-dessus — variable
> absente ou valeur inconnue = **inactif**. Conséquence à connaître : un poste de dev sans
> `NEXT_PUBLIC_APP_ENV` dans son `.env.local` obtient un 404, pas une page.

> `NEXT_PUBLIC_APP_ENV` est une variable `NEXT_PUBLIC_*` : elle est **figée au build** pour tout ce
> qui tourne côté navigateur (l'onglet de navigation backoffice). Elle doit donc être présente au
> moment du build, pas seulement au runtime.

**Pour la mettre en ligne**, quatre choses à faire ensemble, jamais séparément :

1. faire valider la grille (`grille-ponderation.ts` + `ESSENCES_AGRESSIVITE`) par l'expert RGA ;
2. **limiter le débit de `enregistrerResultatVulnerabiliteAction`** : endpoint public, non
   authentifié, sans plafond ni déduplication — tant que la feature est hors production le risque
   est théorique (l'action est un no-op avant tout accès base), il devient réel le jour de la
   bascule, sur les données mêmes qui servent à calibrer la grille ;
3. basculer `isVulnerabiliteRgaActive()` (ajouter `"production"` à `ENVIRONNEMENTS_ACTIFS`) ;
4. retirer le `noindex` des deux pages **et** les entrées correspondantes de `src/app/robots.ts`.

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
  value-objects/resultat-content.const.ts  ← textes de l'écran de résultat, partagés HTML + PDF
  value-objects/niveau-badge.const.ts      ← labels/couleurs des badges de niveau, partagés HTML + PDF
stores/vulnerabilite.store.ts              ← Zustand + sessionStorage (pas de localStorage)
components/                                ← 14 étapes, 10 illustrations SVG, jauge, recommandations
components/pdf/VulnerabilitePdfDocument.tsx ← PDF téléchargeable depuis l'écran de résultat
components/pdf/TelechargerPdfButton.tsx    ← bouton, chargé en `next/dynamic` (seul accès à la lib PDF)
actions/enregistrer-resultat.actions.ts    ← écriture anonyme (best-effort)
```

### Parcours

`intro → adresse → 5 questions eaux (dont récupérateur d'eau) → arbre (+ essence si arbre proche) →
haies → végétation en pied de façade → mitoyenneté → ensoleillement → résultat`

Seule bifurcation : `arbre_essence` n'est posée que si `arbre_proximite === "oui"`. Le compteur
d'étapes passe donc de 11 à 12 selon la réponse.

### Calcul du score

Une seule pondération : le barème par réponse (0 = idéal, 100 = risque maximal),
`grille-ponderation.ts`. Il n'y a **plus** de poids de catégorie ni de poids de critère — la
cascade catégorie → critère → réponse rendait impossible de savoir si un mauvais score « eaux »
était plus grave qu'un mauvais score « végétation », donc arbitraire à calibrer. Chaque critère
répondu compte désormais à égalité.

Le score global n'est pas une moyenne arithmétique simple, mais une **moyenne quadratique
(RMS)** : `racine(moyenne(score²))`, renormalisée sur les seuls critères répondus/applicables
(un critère non répondu ou non applicable — ex. `arbre_essence` sans arbre proche — est exclu du
dénominateur, jamais compté comme « bon »). Une moyenne simple dilue le risque quand quelques
mauvaises réponses sont noyées parmi beaucoup de bonnes (2 critères au pire score sur 12 ne
donnent que 17/100 en moyenne simple) ; la RMS fait mécaniquement peser plus lourd les scores
élevés, donc cumuler plusieurs sources de vulnérabilité fait monter le score plus vite que si
elles étaient isolées (même exemple : 41/100 en RMS). `scoring.service.test.ts` verrouille ce
comportement.

La catégorie `sol` (aléa RGA) compte comme n'importe quel autre critère dans le score (elle
pesait 30 % via le poids de catégorie, elle pèse désormais 1 critère parmi les ~12). Elle reste
en revanche marquée `actionnable: false` : elle entre dans le score mais ne génère **jamais**
de recommandation — on ne demande pas à un ménage de changer son sol.

`CATEGORIES_CONFIG` (sol/eaux/végétation/divers) survit comme simple regroupement d'affichage
(filtre `actionnable` des recommandations, cartes « score moyen par catégorie » de
`/administration/vulnerabilite`) — ces scores par catégorie sont recalculés en RMS non
pondérée sur les seuls critères de la catégorie, purement informatifs, sans effet sur le score
global.

3 niveaux de vulnérabilité (`faible` / `moyen` / `fort`, `scoring.service.ts`), coupures à
34 et 67 (tiers égaux de l'échelle 0-100) — remplacent les 4 niveaux précédents
(`faible`/`modérée`/`élevée`/`très élevée`, coupures 25/50/75).

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

### Export PDF

Bouton secondaire « Télécharger les solutions en PDF » sur l'écran de résultat
(`ResultVulnerabilite.tsx`) : génère et télécharge, **entièrement côté client**
(`PDFDownloadLink` de `@react-pdf/renderer`), un PDF reprenant le score, le callout d'avertissement
(sans le CTA vers `/simulateur`, hors-sujet une fois imprimé), la pédagogie RGA et les cartes de
recommandation — un en-tête façon .gouv.fr (bandeau tricolore + Ministère + « Fonds Prévention
Argile ») en tête de document pour que le lecteur se souvienne d'où il vient une fois imprimé ou
partagé.

`VulnerabilitePdfDocument.tsx` (`components/pdf/`) reconstitue la mise en page en primitives PDF
(`View`/`Text`/`Svg`), le CSS/DSFR n'étant pas disponible dans ce rendu — y compris le triangle
d'alerte « Problème », dessiné en SVG plutôt qu'en glyphe unicode (les polices standard PDFKit
n'ont pas « ▲ »). Les textes (callout, pédagogie) et les couleurs de badge de niveau sont partagés
avec le rendu HTML via `resultat-content.const.ts` et `niveau-badge.const.ts`, pour que les deux
rendus ne puissent pas diverger. Aucune illustration dans le PDF (non demandé, et les schémas SVG
du dossier `illustrations/` ne sont pas conçus pour ce second moteur de rendu).

**`@react-pdf/renderer` n'est jamais dans le first-load** : la lib pèse ~256 Ko gzip, soit plus
que tout le reste de la page, alors que le bouton n'apparaît qu'à la 14e étape. `ResultVulnerabilite`
la charge donc en `next/dynamic(..., { ssr: false })` via `TelechargerPdfButton.tsx`, seul module à
l'importer. Corollaire à ne pas défaire : rien d'autre ne doit importer ce module en statique — y
compris pour une constante partagée — sinon la lib revient dans le bundle d'entrée de
`/vulnerabilite-rga` **et** de l'iframe partenaire `/embed-vulnerabilite-rga` (mesuré : 884 Ko de
first-load JS contre 441 Ko).

Téléchargement tracké via l'évènement Matomo `vulnerabilite_pdf_download`
(`MATOMO_EVENTS.VULNERABILITE_PDF_DOWNLOAD`), même mécanique que les autres évènements du funnel —
consultable directement dans Matomo, pas de compteur dédié côté admin.

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
- Vérifier avec le métier la décision « végétation en pied de façade = à supprimer d'office »,
  aujourd'hui binaire. Le gravier de propreté distingue désormais présence localisée (60) et
  présence sur tout le pourtour (100), mais ces deux valeurs restent, comme le reste de la
  grille, des poids de départ non validés par un expert RGA.

### Cohérence produit

- Les bandes de la jauge (5 × 36°, coupures à 20/40/60/80) ne correspondent pas aux seuils de
  niveau (34/67) : un score de 60 est annoncé « moyenne » avec l'aiguille dans une bande de
  couleur différente. Passer à 3 bandes alignées sur les vrais seuils.
- Une seconde simulation dans la même session écrase le pointeur du parcours (dernière simulation
  connue). Voulu, mais à revoir si l'espace agent doit un jour montrer une évolution dans le temps.

### Technique

- Déplacer `SEUILS_NIVEAU` (34/67) de `scoring.service.ts` vers la grille : ces seuils font
  partie de la méthode, ils pilotent la jauge et tous les badges.
- Supprimer le cas particulier `arbre_essence` (`bareme: []` + `if (critere.id === "arbre_essence")`
  dans `scoring.service.ts`, `getReponseLabel` et `simulation-payload.ts`) en générant son barème
  depuis `ESSENCES_AGRESSIVITE` au chargement du module.
- `getPreviousStep` et `canGoToStep` (`step-flow.rules.ts`) ne sont appelés que par leurs propres
  tests : la navigation arrière passe par `history`. Du code mort qui a l'air couvert.
- Remplacer les couleurs en dur de `niveau-badge.const.ts` (badges `ImpactBadge`, jauge et PDF) par
  les classes/variables DSFR (`fr-badge--success/warning/error`, `--background-contrast-*`) pour
  suivre le thème sombre — la factorisation dans ce fichier (au lieu de deux composants) facilite
  ce remplacement le jour venu.
- `ETAPES_NUMEROTEES_BASE` (`vulnerabilite-step.enum.ts`) duplique volontairement l'ordre et la
  règle de branchement de `step-flow.rules.ts` : à dériver si une seconde question conditionnelle
  apparaît.
- Ajouter un test négatif RBAC sur les trois Server Actions de `vulnerabilite-stats.actions.ts`
  (cf. [RBAC-TEST-PLAN §5](../security/RBAC-TEST-PLAN.md)) — gravité faible (agrégats anonymes),
  mais c'est la règle du repo pour toute nouvelle surface.
- Créer le funnel Matomo du simulateur et renseigner `NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE`
  sur staging (sans elle, le widget funnel affiche « données non disponibles », le reste de
  l'onglet fonctionne).
- La limitation de débit de l'écriture anonyme est suivie comme **étape de mise en ligne** (§2),
  pas comme amélioration : elle n'a pas d'objet tant que l'action est un no-op en production.

---

## 7. Fichiers clés

| Rôle                                          | Fichier                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Méthode de calcul (poids, barèmes, essences)  | `vulnerabilite-rga/domain/value-objects/grille-ponderation.ts`                                |
| Bascule d'environnement                       | `vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite.ts`                       |
| Charge utile + validation Zod                 | `vulnerabilite-rga/domain/value-objects/simulation-payload.ts`                                |
| Calcul du score                               | `vulnerabilite-rga/domain/services/scoring.service.ts`                                        |
| Priorisation des recommandations              | `vulnerabilite-rga/domain/services/recommandations.service.ts`                                |
| Navigation et branchement                     | `vulnerabilite-rga/domain/rules/navigation/step-flow.rules.ts`                                |
| Orchestrateur des 14 étapes                   | `vulnerabilite-rga/components/VulnerabiliteFormulaire.tsx`                                    |
| Écriture anonyme                              | `vulnerabilite-rga/actions/enregistrer-resultat.actions.ts`                                   |
| Table anonyme                                 | `shared/database/schema/vulnerabilite-simulations.ts`                                         |
| PDF téléchargeable                            | `vulnerabilite-rga/components/pdf/VulnerabilitePdfDocument.tsx`                               |
| Bouton PDF (chargement dynamique)             | `vulnerabilite-rga/components/pdf/TelechargerPdfButton.tsx`                                   |
| Textes partagés HTML + PDF                    | `vulnerabilite-rga/domain/value-objects/resultat-content.const.ts`                            |
| Labels/couleurs de niveau partagés HTML + PDF | `vulnerabilite-rga/domain/value-objects/niveau-badge.const.ts`                                |
| Rattachement à la connexion                   | `auth/adapters/franceconnect/franceconnect.service.ts` (`lierSimulationVulnerabiliteAnonyme`) |
| Stats back-office                             | `backoffice/administration/vulnerabilite/services/vulnerabilite-stats.service.ts`             |
| Carte espace agent                            | `backoffice/espace-agent/shared/services/build-info-vulnerabilite.service.ts`                 |
