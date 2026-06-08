# ADR-0008 : Robustesse du tracking Matomo du simulateur et critère d'acceptation

**Date** : 2026-06-08
**Statut** : Accepté

## Contexte

Le funnel Matomo du simulateur RGA affichait des événements dupliqués sur toutes
les étapes (gonflement de ~15 à 45 % selon les étapes). Le symptôme diagnostique :
`type_logement` comptait plus d'événements que `start`, ce qui est logiquement
impossible sur un parcours linéaire (un visiteur passe forcément par `start` avant
`type_logement`). Le ratio `type_logement/start` mesuré valait **1.143** sur 7
jours avant correction.

Trois causes ont été identifiées dans le composant de tracking
(`src/features/simulateur/components/SimulateurFormulaire.tsx`) et le hook
(`src/shared/components/Matomo/useMatomo.ts`) :

1. `trackEvent` était recréé à chaque render (pas de `useCallback`), invalidant
   les dépendances du `useEffect` de tracking.
2. `answers` figurait dans les dépendances du `useEffect` : chaque soumission de
   réponse re-déclenchait le tracking de l'étape courante.
3. À la réhydratation du `sessionStorage` (F5, navigation arrière, réouverture
   d'onglet sur la même session), le `useEffect` retirait l'event de l'étape
   courante sans action utilisateur.

Par ailleurs, le back-office mélangeait `nb_events` et `nb_visits` pour ses
métriques, ce qui amplifiait l'impact des doublons sur les chiffres affichés.

Cet ADR fige les corrections retenues et, surtout, le **critère d'acceptation**
qui permet de considérer le sujet comme clos plutôt que de viser un ratio
théorique de 1.00 impossible à atteindre.

## Décision

Nous neutralisons le double-tracking par trois corrections de robustesse côté
client, nous basons les métriques back-office sur `nb_visits` (visiteurs uniques)
plutôt que `nb_events`, et nous fixons un **seuil d'acceptation du ratio
`type_logement/start` à 1.05–1.15**, l'écart résiduel correspondant à du
comportement utilisateur légitime (restarts, reprises de session).

> Nous traitons le résidu de tracking comme du bruit acceptable et non comme un
> bug : viser exactement 1.00 reviendrait à supprimer des événements légitimes.

## Options envisagées

### Option A — Robustesse client + seuil d'acceptation (retenue)

Corrections appliquées :

- Mémoïsation de `trackEvent`, `trackPageView`, `enableHeatmaps` via `useCallback`
  (PR #168).
- Retrait de `answers` des dépendances du `useEffect`, lecture via
  `useSimulateurStore.getState()` (PR #168).
- Guard `isFirstRender` dans le `useEffect` de tracking : on synchronise
  `previousStepRef` avec `currentStep` sans tracker au montage / à la
  réhydratation (PR #171,
  `SimulateurFormulaire.tsx:83`).
- Bascule des métriques back-office de `nb_events` vers `nb_visits`, cohérent avec
  le funnel Matomo (PR #168, `matomo-api.adapter.ts`).

- Avantages : corrige la cause racine (refires React) sans toucher à la
  configuration Matomo ; `nb_visits` est insensible aux doublons résiduels ; le
  seuil documenté évite une chasse sans fin au ratio parfait.
- Inconvénients : un résidu subsiste (vrais restarts / goBack), non distinguable
  des doublons sans instrumentation supplémentaire.

### Option B — Déduplication côté Matomo (configuration serveur)

- Avantages : indépendant du code client.
- Inconvénients : Matomo ne déduplique pas nativement des événements custom au
  sein d'une visite ; nécessiterait un traitement ETL en aval, lourd pour le
  bénéfice ; ne corrige pas la cause (le client continue d'émettre des doublons).

### Option C — Statu quo (ne rien corriger, ignorer le funnel)

- Avantages : aucun effort.
- Inconvénients : métriques de conversion fausses, funnel inexploitable pour le
  pilotage produit.

## Conséquences

### Positives

- Ratio `type_logement/start` stabilisé et durable : **1.062** (7j), **1.066**
  (30j), **1.078** (90j), mesuré 2 mois après déploiement — dans le seuil
  d'acceptation 1.05–1.15.
- Métriques back-office fiables (basées sur `nb_visits`).
- Pattern de tracking React assaini (mémoïsation, pas de dépendance instable, pas
  de refire à la réhydratation) réutilisable pour d'autres parcours trackés.

### Négatives / Risques

- Le résidu (~6–8 %) n'est pas mesuré finement : on suppose qu'il s'agit de
  restarts / reprises légitimes sans le prouver event par event. Acceptable pour
  le besoin produit actuel.
- Le seuil 1.05–1.15 est empirique ; une dérive durable au-delà devra rouvrir le
  sujet.

### Migration (si applicable)

Aucune. Les corrections sont déployées (PR #168 le 08/04, PR #171 ensuite). Le
script `scripts/ops/debug-matomo-events.ts` est conservé comme outil de
monitoring ponctuel (autonome, sans dette) : son Analyse 5 calcule le ratio
post-fix et le confronte au seuil d'acceptation. À relancer si un doute sur le
funnel réapparaît :

```bash
npx tsx scripts/ops/debug-matomo-events.ts
# ou sur une fenêtre précise
npx tsx scripts/ops/debug-matomo-events.ts --since=YYYY-MM-DD
```

## Liens

- PR : #168 (mémoïsation, retrait `answers`, bascule `nb_visits`)
- PR : #171 (guard `isFirstRender`)
- Composant tracking : `src/features/simulateur/components/SimulateurFormulaire.tsx`
- Hook Matomo : `src/shared/components/Matomo/useMatomo.ts`
- Adapter métriques : `matomo-api.adapter.ts`
- Script de diagnostic : `scripts/ops/debug-matomo-events.ts`
