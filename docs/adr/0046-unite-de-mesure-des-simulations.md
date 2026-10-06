# ADR-0046 : Compter les simulations en visites, partout

**Date** : 2026-10-06
**Statut** : Accepté

## Contexte

L'onglet Acquisition affiche toutes les simulations par département, et non plus un top 5. Le total de ce tableau dépasse celui de l'entonnoir (relevé en octobre 2026 sur 30 jours : 8 301 contre 7 962). Les deux comptent des **visites**, mais à partir de deux rapports Matomo différents.

- L'entonnoir et `/stats` lisent `Events.getAction` : chaque évènement `simulateur_result_*` donne son `nb_visits`. Une visite qui affiche un résultat compte une fois par verdict.
- Le tableau lit le rapport de la dimension département (`CustomDimensions.getCustomDimension`, `flat=1`) : une ligne par couple **département × URL**. Une visite compte donc une fois par département et par page qu'elle touche.

Les visites par département ne s'additionnent donc pas : une visite qui touche deux départements, ou deux pages, compte dans chacun.

Une première version a fait du **nom de l'évènement** la seule source, comptée en `nb_events` : additive par construction. Mais les résultats déjà envoyés n'ont pas de nom, et le tableau serait resté presque vide pendant des mois sur « Depuis le début ». Elle a été retirée (branche `feat/simulations-par-departement`).

## Décision

> Les simulations sont comptées en **visites** ayant affiché un résultat, partout : entonnoir, `/stats`,
> Top 5 et tableau par département. Le tableau garde le rapport de la dimension département ; son écart
> avec l'entonnoir est expliqué à l'écran.

- **Lecture** : `fetchMatomoEvents` alimente l'entonnoir, le rapport de la dimension département alimente
  le tableau. La limite de 100 lignes est levée (`filter_limit=-1`) et les codes `3` et `03` sont
  regroupés (PR #394).
- **Libellés** : « simulations » désigne des visites. Les infobulles et la note de `/stats` le disent.
- **Suivi** : porter le département dans le nom de l'évènement, pour basculer plus tard vers un comptage
  additif, n'est pas livré avec cet ADR. Voir `docs/SUJETS-A-TRAITER.md`.

## Options envisagées

### Option A — Visites partout (retenue)

- Avantages : tout l'historique est réparti par département dès aujourd'hui ; une seule unité entre
  `/stats` et le back-office.
- Inconvénients : le total du tableau dépasse l'entonnoir ; « simulations terminées » compte des visites,
  ce que les libellés doivent dire.

### Option B — Le nom de l'évènement comme seule source, en `nb_events`

- Avantages : additif par construction, le total tombe toujours juste ; filtre département sans requête
  segmentée.
- Inconvénients : aucune répartition par département avant le déploiement, donc un tableau vide pendant
  des mois ; écart d'unité avec `/stats`. Essayée puis retirée.

### Option C — Une requête segmentée par département

- Avantages : des visites distinctes par département, sur tout l'historique.
- Inconvénients : autant de requêtes Matomo que de départements, sur l'instance partagée de beta.gouv. La
  combinaison `period=range` et segment département est déjà la première cause de timeout (voir
  `CLAUDE.md`). Inutilisable à l'écran.

## Conséquences

### Positives

- Le tableau répartit tout l'historique par département.
- `/stats`, l'entonnoir et le Tableau de bord affichent la même unité, sur des périodes différentes.

### Négatives / Risques

- Le total du tableau ne retombe pas sur l'entonnoir : l'écart est expliqué sous le tableau.
- Les écrans de correction (`SimulateurEdition`, `SimulateurEditionInvitation`) rendent le même
  formulaire et envoient les mêmes évènements, et un résultat réaffiché repart : ces cas gonflent le
  compte. Non traité ici, suivi dans `docs/SUJETS-A-TRAITER.md`.

### Migration

Rien à migrer.

## Liens

- Lecture : `src/features/backoffice/administration/acquisition/adapters/matomo-api.adapter.ts`,
  `tableau-de-bord/services/tableau-de-bord.service.ts` (`getSimulationsMatomo`, `getTopDepartementsMatomo`)
- Affichage : `src/app/(backoffice)/administration/acquisition/components/simulateur/SimulationsParDepartementTable.tsx`
- Documentation : [docs/stats/STATISTIQUES.md](../stats/STATISTIQUES.md), [ADR-0033](0033-granularite-events-matomo-dashboard.md)
- PR : MTES-MCT/fonds-prevention-argile#394
