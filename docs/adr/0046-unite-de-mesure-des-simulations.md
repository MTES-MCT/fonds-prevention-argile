# ADR-0046 : Compter les simulations en visites, partout

**Date** : 2026-10-06
**Statut** : Accepté

## Contexte

L'onglet Acquisition affiche toutes les simulations par département, et non plus un top 5. Le total de ce tableau dépasse celui de l'entonnoir : sur septembre 2026 (relevé en lecture seule le 2026-10-07), 7 903 pour l'entonnoir et 8 138 pour le tableau, soit +3,0 %. Les deux comptent des **visites**, mais à partir de deux rapports Matomo différents.

- L'entonnoir et `/stats` lisent `Events.getAction` : chaque évènement `simulateur_result_*` donne son `nb_visits`. Une visite qui affiche un résultat compte une fois par verdict.
- Le tableau lit le rapport de la dimension département (`CustomDimensions.getCustomDimension`, `flat=1`) : une ligne par couple **département × URL**. Une visite peut donc compter une fois par département et par page qu'elle touche.

Les visites par département ne s'additionnent donc pas : une visite qui touche plusieurs départements ou plusieurs pages peut compter plusieurs fois. Sur la même période, 4,3 % des visites du rapport viennent d'autres URL que `/simulateur` (partenaires en iframe, écrans de correction) ; la part exacte de doubles comptes n'est pas établie. Aucune ligne du rapport n'est sans département : des visites sans département n'y apparaîtraient pas, et il ne permet pas de les compter. Avant la PR #394, le plafond par défaut de Matomo (100 lignes par verdict) retirait 146 visites (1,8 %) du rapport et masquait une partie de l'écart.

Une première version a fait du **nom de l'évènement** la seule source, comptée en `nb_events` : additive par construction. Mais les résultats déjà envoyés n'ont pas de nom, et le tableau serait resté presque vide pendant des mois sur « Depuis le début ». Elle a été retirée (branche `feat/simulations-par-departement`).

## Décision

> Les simulations sont comptées en **visites** ayant affiché un résultat, partout : entonnoir, `/stats`,
> Top 5 et tableau par département. Le tableau garde le rapport de la dimension département ; son écart
> avec l'entonnoir est expliqué à l'écran.

- **Lecture** : `fetchMatomoEvents` alimente l'entonnoir, le rapport de la dimension département alimente
  le tableau. La limite de 100 lignes est levée pour les seuls rapports par département
  (`toutesLesLignes`, `filter_limit=-1`) et les codes `3` et `03` sont regroupés (PR #394).
- **Libellés** : « Simulations terminées » devient « Visites avec un résultat » (entonnoir, Tableau de bord, `/stats`). Les infobulles disent ce que chaque chiffre compte et pourquoi le tableau par département peut être plus élevé.
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
  formulaire et envoient les mêmes évènements, et un résultat réaffiché repart : ces cas peuvent gonfler
  le compte en visites, sans qu'on sache de combien. Non traité ici, suivi dans `docs/SUJETS-A-TRAITER.md`.

### Migration

Rien à migrer.

## Mise à jour du 2026-10-08

Mesure en lecture seule sur 30 jours (du 9 septembre au 8 octobre, aujourd'hui compris) : entonnoir 7 842, somme des lignes du tableau 8 246, soit +404. Deux causes distinctes :

- **Retard du rapport d'évènements** : 167 visites des 7 et 8 octobre (130 + 37) que l'entonnoir n'avait pas encore reçues, alors que le comptage direct de visites les voit. Cause non établie (hypothèse : archivage de Matomo), à faire vérifier côté administration.
- **Doubles comptes du tableau** : 237 (8 246 contre 8 009 une fois ces visites ajoutées, soit +3,0 %). Sur les éligibles, 1 894 lignes pour 1 812 visites distinctes. Le rapport hiérarchique de la dimension (sans `flat`) donne les mêmes nombres : Matomo ne dédoublonne pas par département.

**Décision complémentaire.** Le pied du tableau affiche deux lignes : « Somme des lignes » (cumul non dédoublonné) puis « Total, même mesure que l'entonnoir », qui reprend les chiffres de l'entonnoir pour la période, le département et le partenaire en cours (« Indisponible » s'ils manquent, jamais 0). Pour les périmètres pilotes et hors pilotes, seul « Cumul des lignes affichées » apparaît : aucun total global n'en est l'équivalent. Les lignes ne changent jamais selon l'état de l'interface. Le titre et la colonne deviennent « Visites avec un résultat », avec la mention « Cumul non dédoublonné entre pages et départements ».

**Option C mesurée, non retenue pour l'instant.** Compter par département les visites dont l'évènement de résultat porte lui-même le département (segment `eventAction==…;dimension==département`) rend les lignes additives côté éligibles : 1 816 visites sur 30 départements, égales aux 1 816 visites distinctes, sans doublon entre départements ; les 83 d'écart avec les lignes sont des doublons de pages. Non mesuré pour les non éligibles (deux départements seulement), ni sur une période close. Un appel par département et par verdict, de 3 à 90 s chacun : il faudrait un pré-calcul quotidien en base (comptes journaliers sommables), avec le filtre partenaire, la limite d'historique et l'alignement de l'entonnoir à traiter. Voir `docs/SUJETS-A-TRAITER.md`.

**Option D écartée — `Live.getLastVisitsDetails`.** Reconstruire les visites une à une manipule des données de visiteurs et un volume important.

## Liens

- Lecture : `src/features/backoffice/administration/acquisition/adapters/matomo-api.adapter.ts`,
  `tableau-de-bord/services/tableau-de-bord.service.ts` (`getSimulationsMatomo`, `getTopDepartementsMatomo`)
- Affichage : `src/app/(backoffice)/administration/acquisition/components/simulateur/SimulationsParDepartementTable.tsx`
- Documentation : [docs/stats/STATISTIQUES.md](../stats/STATISTIQUES.md), [ADR-0033](0033-granularite-events-matomo-dashboard.md)
- PR : MTES-MCT/fonds-prevention-argile#394
