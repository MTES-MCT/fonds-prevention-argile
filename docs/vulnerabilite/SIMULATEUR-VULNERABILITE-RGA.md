# Simulateur de vulnérabilité RGA

Document de référence du second simulateur public (`/vulnerabilite-rga`) : périmètre, disponibilité
par environnement, architecture, méthode de catégorisation, et **backlog des améliorations à faire** avant
d'envisager une mise en production.

> À lire avant toute évolution de la feature `src/features/vulnerabilite-rga/`, de l'onglet
> `/administration/vulnerabilite` ou de la carte « Vulnérabilité au RGA » de l'espace agent.
> Décisions structurantes : [ADR-0030](../adr/0030-simulateur-vulnerabilite-rga.md) (architecture),
> [ADR-0031](../adr/0031-stats-vulnerabilite-matomo-bdd.md) (stats),
> [ADR-0045](../adr/0045-categorisation-qualitative-vulnerabilite.md) (catégorisation, sans score),
> [ADR-0032](../adr/0032-rattachement-simulation-vulnerabilite-compte.md) (rattachement au compte).

---

## 1. Objectif et périmètre

Sensibiliser le grand public au risque de retrait-gonflement des argiles à partir du **seul
environnement proche de la maison**, expliquer les bonnes pratiques et déclencher des actions à
moindre coût. Ce n'est **pas** un diagnostic, et ce n'est **pas** le simulateur d'éligibilité :

|                | `/simulateur` (éligibilité)                      | `/vulnerabilite-rga` (vulnérabilité)                    |
| -------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Question posée | « Ai-je droit au Fonds ? »                       | « Qu'est-ce qui fragilise ma maison, et que faire ? »   |
| Sortie         | éligible / non éligible, entrée dans le parcours | points critiques / de vigilance / à surveiller + fiches |
| Sujet          | logement, revenus, aléa                          | environnement proche : eaux, végétation, exposition     |
| Compte requis  | oui à terme (FranceConnect)                      | non, jamais                                             |

Le questionnaire ne porte volontairement **ni sur le bâti** (année, niveaux, fondations) **ni sur les
revenus** : 12 questions, observables depuis le jardin.

---

## 2. Disponibilité par environnement

**La feature n'est pas déployée en production.** Sa grille de catégorisation n'est pas encore complète (essences d'arbre
sans catégorie, fiches conseil manquantes) : publier un résultat partiel engagerait le produit sur
une méthode qu'il ne peut pas encore défendre.

Bascule unique : `isVulnerabiliteRgaActive()`
(`domain/value-objects/vulnerabilite-disponibilite.ts`), dérivée de `NEXT_PUBLIC_APP_ENV` —
actif en `local`, `docker` et `staging`, **inactif en `production`** — sauf interrupteur explicite, voir plus bas.

| Surface                                       | Comportement quand inactif                                               |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `/vulnerabilite-rga`                          | 404                                                                      |
| `/embed-vulnerabilite-rga`                    | 404                                                                      |
| `/administration/vulnerabilite`               | 404                                                                      |
| Onglet « Vulnérabilité » de la nav backoffice | masqué (`AdminNavTab.estDisponible`)                                     |
| `enregistrerResultatVulnerabiliteAction`      | no-op — une Server Action reste appelable même quand sa page renvoie 404 |

> La carte « Vulnérabilité au RGA » de l'espace agent (`VulnerabiliteDossier`) suit la même bascule : inactive,
> elle disparaît, résultat existant compris. L'adresse partagée entre simulateurs (ADR-0048) n'est pas non plus
> gardée en `sessionStorage` quand la feature est inactive.

> **Liste d'autorisation, pas de refus de la production.** Le lecteur d'environnement partagé
> applique un défaut "local" quand la variable est absente : une app mal configurée servirait
> alors le simulateur. La bascule teste donc l'appartenance à la liste ci-dessus — variable
> absente ou valeur inconnue = **inactif**. Conséquence à connaître : un poste de dev sans
> `NEXT_PUBLIC_APP_ENV` dans son `.env.local` obtient un 404, pas une page.

> **Interrupteur explicite** : `NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE` prime sur l'environnement, dans les deux
> sens, sans toucher à `NEXT_PUBLIC_APP_ENV` (dont dépendent Matomo, les e-mails et les garde-fous des scripts
> ops ; une valeur hors des quatre connues est refusée par Zod).
>
> | Valeur                        | Effet                                                                                            |
> | ----------------------------- | ------------------------------------------------------------------------------------------------ |
> | `false`                       | désactive tous les points d'entrée, staging compris : on y voit le comportement de la production |
> | `true`                        | active partout, **production comprise** : c'est la mise en ligne                                 |
> | absente ou toute autre valeur | la liste d'environnements ci-dessus décide (`TRUE`, `1` ou `oui` ne publient donc rien)          |
>
> Comme toute variable `NEXT_PUBLIC_*`, elle n'agit qu'après un **nouveau build** : un simple redémarrage ne suffit
> pas. Poser `true` sur la production publie le simulateur : respecter d'abord les prérequis ci-dessous.

> **Garde-fou.** `garde-hors-production.test.ts` échoue quand un fichier pose un lien vers le simulateur (URL,
> routes du compte et de l'espace agent, contenu de la home) sans passer par `isVulnerabiliteRgaActive()`, quand un
> composant ou une action listés ne la portent plus, ou quand une page `*vulnerabilite*` ne répond plus 404.

> `NEXT_PUBLIC_APP_ENV` est une variable `NEXT_PUBLIC_*` : elle est **figée au build** pour tout ce
> qui tourne côté navigateur (l'onglet de navigation backoffice). Elle doit donc être présente au
> moment du build, pas seulement au runtime.

**Pour la mettre en ligne**, quatre choses à faire ensemble, jamais séparément :

1. faire valider la grille (`grille-categorisation.ts`) par l'expert RGA, essences comprises ;
2. **limiter le débit de `enregistrerResultatVulnerabiliteAction`** : endpoint public, non
   authentifié, sans plafond ni déduplication — tant que la feature est hors production le risque
   est théorique (l'action est un no-op avant tout accès base), il devient réel le jour de la
   bascule ;
3. poser `NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE=true` sur l'app de production **avant le build** (aucune modification de code) ;
4. retirer le `noindex` des deux pages **et** les entrées correspondantes de `src/app/robots.ts`.

### Points d'entrée

Tous derrière la même bascule : hors des environnements actifs, aucun ne s'affiche, pour ne pas mener à un 404.

| Entrée                 | Où                                                                                                      | Condition d'affichage                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Bloc de la home        | `VulnerabiliteSection`, après « Comment bénéficier de l'aide de l'État »                                | bascule active ; l'aperçu de résultat est illustratif, sans score                            |
| Écran « non éligible » | `ResultNonEligible` : callout « mais vous pouvez agir » et bouton                                       | bascule active, site principal (pas l'iframe), maison, propriétaire                          |
| « Ma liste » du compte | `VulnerabiliteMaListe`, trois cas : à faire, points à traiter, au top                                   | bascule active, à toutes les étapes du parcours                                              |
| Dossier côté agent     | `VulnerabiliteDossier` sur les pages dossier, demande et prospect : « Faire le test avec le demandeur » | bascule active ; AMO, Aller-vers et hybride (ni super-admin, ni analyste, ni administrateur) |
| Résultat du compte     | `/mon-compte/vulnerabilite`, lecture seule, relu depuis la base                                         | bascule active, test rattaché au compte, sinon renvoi vers le simulateur                     |

> `/vulnerabilite-rga` vit dans le groupe de routes `(tunnel)` ([ADR-0040](../adr/0040-tunnel-simulateur-adresse-en-deux-ecrans.md)),
> comme `/simulateur` : header réduit à l'aide, pas de navigation. L'iframe `/embed-vulnerabilite-rga` n'est pas concernée.

### Passage d'un simulateur à l'autre

L'adresse choisie dans l'un s'ouvre dans l'autre, bâtiment présélectionné, via un store partagé en
`sessionStorage` ([ADR-0048](../adr/0048-adresse-partagee-entre-simulateurs.md)). L'aléa est recalculé depuis la
BDNB et non repris de l'éligibilité ; l'EPCI, absent côté vulnérabilité, est retrouvé à l'arrivée sur l'éligibilité.
Depuis le compte, l'adresse de la simulation d'éligibilité préremplit le test.

---

## 3. Architecture

Feature DDD-lite autonome. Elle réutilise les briques génériques (`shared/adapters/ban`,
`shared/services/bdnb`, `features/rga-map`, route `/api/rga/alea`) et, seule dépendance vers
`features/simulateur`, ses trois règles d'éligibilité pures (cf. ADR-0045).

```
domain/
  value-objects/grille-categorisation.ts   ← LA méthode (catégorie par réponse). Seul fichier à ajuster.
  value-objects/simulation-payload.ts      ← charge utile + validation Zod, dérivée de la grille
  value-objects/vulnerabilite-critere-fields.ts  ← critère ↔ colonne DB ↔ réponse aplatie
  value-objects/vulnerabilite-disponibilite.ts   ← bascule d'environnement
  services/categorisation.service.ts       ← réponses → points catégorisés, décompte
  services/synthese-resultat.service.ts    ← phrase et niveau du callout, partagés HTML + PDF
  services/eligibilite-fonds.service.ts    ← renvoi vers `/simulateur`, règles importées
  services/recommandations.service.ts      ← fiches regroupées en trois sections
  catalogues/recommandations.catalogue.ts  ← fiches conseil, par critère et réponse déclenchante
  rules/navigation/step-flow.rules.ts      ← ordre des étapes + branchement arbre → essence
  value-objects/resultat-content.const.ts  ← textes de l'écran de résultat, partagés HTML + PDF
stores/vulnerabilite.store.ts              ← Zustand + sessionStorage (pas de localStorage)
components/                                ← 14 étapes, 10 illustrations SVG, synthèse, recommandations
components/pdf/VulnerabilitePdfDocument.tsx ← PDF téléchargeable depuis l'écran de résultat
components/pdf/TelechargerPdfButton.tsx    ← bouton, chargé en `next/dynamic` (seul accès à la lib PDF)
actions/enregistrer-resultat.actions.ts    ← écriture anonyme (best-effort)
```

### Parcours

`intro → adresse → 5 questions eaux (dont récupérateur d'eau) → arbre (et son essence) →
haies → végétation en pied de façade → mitoyenneté → ensoleillement → résultat`

Parcours linéaire, 11 étapes numérotées. La question sur une source de chaleur en sous-sol a été
retirée, sa colonne supprimée (migration `0058`) : elle n'avait servi qu'en préproduction. L'essence de l'arbre n'a plus d'écran propre : elle
apparaît sous la question de proximité dès la réponse « Oui », et « Suivant » l'exige alors.
Revenir à « Non » ou « Je ne sais pas » l'efface.

### Catégorisation des réponses

Il n'y a plus de score (ADR-0045). Chaque réponse porte une catégorie, fournie par le métier et
lue dans `grille-categorisation.ts` :

| Catégorie        | Label sur la réponse    | Effet sur le résultat                     |
| ---------------- | ----------------------- | ----------------------------------------- |
| `critique`       | Point critique          | compté dans la synthèse, section en tête  |
| `vigilance`      | Point de vigilance      | compté dans la synthèse, deuxième section |
| `a_verifier`     | À surveiller            | troisième section                         |
| `bonne_pratique` | Bonne pratique en place | aucun                                     |
| `sans_objet`     | aucun                   | aucun — ni affichée ni comptée            |

Quatre règles à connaître :

- **L'aléa RGA n'est pas une question.** Donnée de contexte issue de la carte, il est cité dans la
  synthèse et ne produit aucun point.
- **C'est l'essence qui porte le point de l'arbre**, « arbre proche = oui » étant `sans_objet`.
  Elle se choisit parmi quatre groupes (exemples d'essences affichés en bleu sous chaque groupe) :

  | Groupe                          | Exemples                                                                             | Catégorie    |
  | ------------------------------- | ------------------------------------------------------------------------------------ | ------------ |
  | Arbre très agressif             | chêne, peuplier, saule, cèdre, frêne                                                 | critique     |
  | Arbre moyennement agressif      | acacia, marronnier, tilleul, aubépine, hêtre                                         | vigilance    |
  | Arbre peu agressif              | platane, pommier, poirier, érable, cerisier, prunier, bouleau, cyprès, sorbier, orme | à surveiller |
  | Autre essence ou je ne sais pas | —                                                                                    | critique     |

  Les groupes sont nommés par agressivité, plus par type d'arbre. Ils reprennent le classement de
  l'étude britannique de Cutler et Richardson (1989), cité sous la question, avec la répartition
  arrêtée par le métier en octobre 2026. Les simulations enregistrées avant ce changement
  (préproduction seulement) gardent d'anciennes valeurs, que la grille ne reconnaît plus.

- **« À surveiller » s'explique** : un point sans problème a priori, qui peut devenir critique
  (fuite, défaut d'entretien). L'explication (`CATEGORIES_AFFICHAGE.a_verifier.explication`)
  s'affiche sous la réponse sélectionnée et sous le titre de la section de résultat. L'id
  `a_verifier` est conservé : les statistiques le relisent.
- **Un test échoue si une réponse n'a pas de catégorie** (`grille-categorisation.test.ts`).

### Écran de résultat

Dans l'ordre : la synthèse, le callout expert, la pédagogie, les fiches.

- **Synthèse** (`SyntheseResultat`) : mise en avant DSFR (`fr-callout`, pas une alerte — c'est un
  contenu éditorial, pas un retour système). Accent `pink-tuile` dès qu'un point est critique,
  `yellow-moutarde` s'il n'y a que de la vigilance, `green-emeraude` sinon. L'icône et le titre
  doublent la couleur. En aléa faible ou hors zone argileuse, une phrase relativise les points
  sans les retirer : la carte d'aléa est une estimation, sans conséquence si le sol s'avère non
  argileux, déterminante s'il l'est. L'accent descend alors d'un cran (`yellow-moutarde` pour des
  points critiques, champ `accent`), le titre gardant le niveau réel.
- **Callout expert** : toujours affiché. Son bouton vers `/simulateur` et sa dernière phrase (le
  fonds peut financer le diagnostic) sont conditionnels — département éligible, aléa fort, maison
  non mitoyenne (`remplitCriteresEligibiliteFonds`, qui appelle les règles du simulateur
  d'éligibilité). Même règle dans le PDF.
- **Fiches** : celles du catalogue, regroupées en « Points critiques », « Points de vigilance »,
  « Points à surveiller », une section vide étant omise. Chaque réponse à traiter a sa fiche : une fiche
  vaut un point, et `getReponsesSansCarte` (test du service) échoue si une nouvelle réponse à
  traiter n'en a pas. Une fiche garde le même contenu quelle que soit la catégorie qui la
  déclenche, seule la section change. Toutes les sections restent dépliées. Pour qu'on sache
  toujours dans quelle section on lit, chaque en-tête de section porte un filet de la couleur de
  sa catégorie et son nombre de points, et chaque fiche un liseré gauche et le badge de sa
  catégorie (couleurs dans `CATEGORIES_AFFICHAGE.accent`, jeton DSFR à l'écran, hexadécimal dans
  le PDF, qui reprend le même repérage).

---

## 4. Enregistrement et statistiques

Chaque simulation terminée écrit une ligne dans `vulnerabilite_simulations` — table **strictement
anonyme** : pas de FK `users`, pas d'adresse, pas de commune, pas de coordonnées, pas
d'identifiant de visiteur. Seuls le code département et les réponses : les catégories se relisent
dans la grille en vigueur, elles ne sont pas stockées.

Deux garde-fous, parce que la page est publique et non authentifiée :

- le navigateur n'envoie qu'une charge utile réduite (`toSimulationPayload`) — l'adresse, les
  coordonnées, la clé BAN et l'identifiant RNB **ne quittent jamais le navigateur** ;
- le serveur valide chaque réponse contre la grille : seule une réponse connue est stockée, et
  aucune catégorie n'est acceptée du client.

Répartition Matomo / BDD (ADR-0031) : Matomo pour le volume, le funnel et la répartition par
département ; la table pour la répartition par réponse et le nombre moyen de points par
catégorie (critiques en tête), que Matomo ne sait pas agréger. Onglet `/administration/vulnerabilite`, ouvert à tous les agents (agrégats non nominatifs,
même logique qu'ADR-0017).

### Export PDF

Bouton secondaire « Télécharger les solutions en PDF » sur l'écran de résultat
(`ResultVulnerabilite.tsx`) : génère et télécharge, **entièrement côté client**
(`PDFDownloadLink` de `@react-pdf/renderer`), un PDF reprenant la synthèse, le callout d'avertissement
(sans le CTA vers `/simulateur`, hors-sujet une fois imprimé), la pédagogie RGA et les cartes de
recommandation par section — un en-tête façon .gouv.fr (bandeau tricolore + Ministère + « Fonds Prévention
Argile ») en tête de document pour que le lecteur se souvienne d'où il vient une fois imprimé ou
partagé.

`VulnerabilitePdfDocument.tsx` (`components/pdf/`) reconstitue la mise en page en primitives PDF
(`View`/`Text`/`Svg`), le CSS/DSFR n'étant pas disponible dans ce rendu — y compris le triangle
d'alerte « Problème », dessiné en SVG plutôt qu'en glyphe unicode (les polices standard PDFKit
n'ont pas « ▲ »). La synthèse et les sections sont calculées une fois et passées aux deux rendus ; les
textes (callout, pédagogie) sont partagés via `resultat-content.const.ts`.

**Illustrations des fiches.** `@react-pdf/renderer` n'accepte que PNG et JPEG : le bouton
convertit d'abord les schémas SVG en PNG dans le navigateur (`rasteriser-illustrations.ts`,
canvas au double de la taille native) et ne monte le document qu'ensuite. Une illustration
en échec est omise, sans bloquer le PDF. La table `illustrationId → SVG` est partagée avec
l'écran (`illustrations/illustrations-recommandations.ts`).

**Sauts de page.** Une fiche ne se coupe jamais (`wrap={false}`), pas plus qu'une puce, la
synthèse ou le callout. Le titre d'une section est attaché à sa première fiche dans un même bloc
insécable : `minPresenceAhead` a été essayé et ne l'empêchait pas de rester seul en bas de page.

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

### L'agent fait le test pour le demandeur

Au téléphone, l'AMO ou l'Aller-vers lance le simulateur depuis le dossier (`/espace-agent/vulnerabilite/[id]`, même
identifiant que l'édition de simulation). L'adresse vient de la simulation du dossier, et le résultat est rattaché au
parcours par `enregistrerTestVulnerabiliteAgentAction`, avec une action système dans l'historique. Pas de funnel
Matomo, pas d'adresse partagée avec le navigateur de l'agent, et le store est remis à zéro entre deux dossiers
([ADR-0032](../adr/0032-rattachement-simulation-vulnerabilite-compte.md), amendement).

### Le demandeur relit son résultat

`parcours_prevention.vulnerabilite_simulation_id` sert aussi le demandeur : `getMaVulnerabilite` (service
`parcours/core`) relit la ligne du parcours **de la session**, sans identifiant venu du client, et rejoue la
catégorisation. « Ma liste » n'en tire qu'un résumé (`buildResumeVulnerabilite` : niveau, décompte, trois points
prioritaires), jamais un score ; la page `/mon-compte/vulnerabilite` rend le résultat complet, avec le PDF. Un test
refait écrase le pointeur : le compte ne garde que le dernier.

---

## 6. Améliorations à faire

Priorisé. Les points bloquants pour une mise en production sont marqués **P0**.

### Méthode et contenu

- Préciser à l'écran ce que « proche » veut dire pour l'arbre et la haie.
- La fiche arbre s'affiche aussi sur « je ne sais pas », alors que son texte suppose un arbre
  présent : à reformuler ou à dédoubler.

### Cohérence produit

- Une seconde simulation dans la même session écrase le pointeur du parcours (dernière simulation
  connue). Voulu, mais à revoir si l'espace agent doit un jour montrer une évolution dans le temps.
- Les libellés des réponses vivent à deux endroits : la grille (stats, espace agent, PDF) et les
  composants `Step*` (questionnaire). Ils diffèrent légèrement ; à unifier dans la grille.

### Technique

- `getPreviousStep` et `canGoToStep` (`step-flow.rules.ts`) ne sont appelés que par leurs propres
  tests : la navigation arrière passe par `history`. Du code mort qui a l'air couvert.
- Remplacer les couleurs en dur de `CATEGORIES_AFFICHAGE` (badge et PDF) par les classes ou
  variables DSFR pour suivre un éventuel thème sombre.
- `ETAPES_NUMEROTEES_BASE` (`vulnerabilite-step.enum.ts`) duplique volontairement l'ordre et la
  règle de branchement de `step-flow.rules.ts` : à dériver si une seconde question conditionnelle
  apparaît.
- Ajouter un test négatif RBAC sur les trois Server Actions de `vulnerabilite-stats.actions.ts`
  (cf. [RBAC-TEST-PLAN §5](../security/RBAC-TEST-PLAN.md)) — gravité faible (agrégats anonymes),
  mais c'est la règle du repo pour toute nouvelle surface.
- Créer le funnel Matomo du simulateur (sans l'étape `vulnerabilite_step_source_chaleur_sous_sol`, retirée),
  et renseigner `NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE` sur staging (sans elle, le widget
  funnel affiche « données non disponibles », le reste de l'onglet fonctionne).
- La limitation de débit de l'écriture anonyme est suivie comme **étape de mise en ligne** (§2),
  pas comme amélioration : elle n'a pas d'objet tant que l'action est un no-op en production.

---

## 7. Fichiers clés

| Rôle                                   | Fichier                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Méthode (catégorie par réponse)        | `vulnerabilite-rga/domain/value-objects/grille-categorisation.ts`                                                     |
| Bascule d'environnement                | `vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite.ts`                                               |
| Charge utile + validation Zod          | `vulnerabilite-rga/domain/value-objects/simulation-payload.ts`                                                        |
| Catégorisation et décompte des points  | `vulnerabilite-rga/domain/services/categorisation.service.ts`                                                         |
| Synthèse du résultat (callout)         | `vulnerabilite-rga/domain/services/synthese-resultat.service.ts`                                                      |
| Renvoi conditionnel vers `/simulateur` | `vulnerabilite-rga/domain/services/eligibilite-fonds.service.ts`                                                      |
| Sections de recommandations            | `vulnerabilite-rga/domain/services/recommandations.service.ts`                                                        |
| Navigation et branchement              | `vulnerabilite-rga/domain/rules/navigation/step-flow.rules.ts`                                                        |
| Orchestrateur des 14 étapes            | `vulnerabilite-rga/components/VulnerabiliteFormulaire.tsx`                                                            |
| Écriture anonyme                       | `vulnerabilite-rga/actions/enregistrer-resultat.actions.ts`                                                           |
| Table anonyme                          | `shared/database/schema/vulnerabilite-simulations.ts`                                                                 |
| PDF téléchargeable                     | `vulnerabilite-rga/components/pdf/VulnerabilitePdfDocument.tsx`                                                       |
| Bouton PDF (chargement dynamique)      | `vulnerabilite-rga/components/pdf/TelechargerPdfButton.tsx`                                                           |
| Textes partagés HTML + PDF             | `vulnerabilite-rga/domain/value-objects/resultat-content.const.ts`                                                    |
| Rattachement à la connexion            | `auth/adapters/franceconnect/franceconnect.service.ts` (`lierSimulationVulnerabiliteAnonyme`)                         |
| Stats back-office                      | `backoffice/administration/vulnerabilite/services/vulnerabilite-stats.service.ts`                                     |
| Carte espace agent                     | `backoffice/espace-agent/shared/services/build-info-vulnerabilite.service.ts`                                         |
| Résultat relu côté demandeur           | `parcours/core/services/ma-vulnerabilite.service.ts`, `app/(main)/mon-compte/vulnerabilite`                           |
| Test fait par l'agent                  | `espace-agent/shared/actions/test-vulnerabilite-agent.actions.ts`, `app/(backoffice)/espace-agent/vulnerabilite/[id]` |
| Encart « Ma liste »                    | `parcours/core/components/common/VulnerabiliteMaListe.tsx`                                                            |
| Adresse partagée (ADR-0048)            | `shared/adapters/ban/adresse-choisie.ts`, `shared/stores/adresse-choisie.store.ts`                                    |
