# ADR-0046 : Compter des simulations, pas des visites, et porter le département dans l'évènement

**Date** : 2026-10-06
**Statut** : Accepté

## Contexte

L'onglet Acquisition montre désormais toutes les simulations par département, et pas seulement un
top 5. Le total de ce tableau dépassait celui de l'entonnoir (8 301 contre 7 962 sur 30 jours) : les
deux comptaient des **visites**, mais par deux rapports Matomo différents.

- L'entonnoir lisait `Events.getAction` : une visite qui affiche un résultat compte une fois.
- Le tableau lisait le rapport de la dimension personnalisée département (`CustomDimensions`), en
  `flat=1`. Une visite y est comptée une fois **par département et par URL** qu'elle touche.

Mesuré sur la production, à partir du 7 septembre 2026, l'écart des éligibles se décomposait ainsi :

| Cause                                                                              | Visites |
| ---------------------------------------------------------------------------------- | ------- |
| Même visite sur plusieurs URL (simulateur, `/mon-compte/simulation`, espace agent) | +56     |
| Visite ayant simulé dans plusieurs départements                                    | +25     |
| Visite sans département                                                            | −1      |

Aucune relecture des rapports existants ne pouvait faire tomber la somme des départements sur le
total. Une visite peut porter plusieurs départements, donc le nombre de visites ne s'additionne pas
par département. Et dédoublonner par requête segmentée coûte deux à trois minutes par département.

La mesure a aussi montré deux comptages parasites :

- un résultat réaffiché sans changement (retour en arrière, rechargement) repartait comme un nouvel
  évènement ;
- les écrans d'édition (correction par un agent, `/mon-compte/simulation`) envoyaient les mêmes
  évènements qu'une simulation.

## Décision

> Une **simulation terminée** est un évènement de résultat (`simulateur_result_eligible` ou
> `_non_eligible`), compté en `nb_events`. Son nom porte le code département officiel, et c'est la
> seule source de l'entonnoir, des top 5 départements, du tableau et du filtre département.

- **Suivi** (`SimulateurFormulaire`, `simulateur/domain/utils/suivi-resultat.ts`) : le nom de
  l'évènement reçoit le département. Une même simulation (empreinte des réponses) n'est envoyée
  qu'une fois par session. Rien n'est envoyé en mode édition.
- **Lecture** (`fetchMatomoSimulationsTerminees`) : rapport `Events.getName`. Les noms y sont au
  premier niveau, archivés jusqu'à 500 lignes, au lieu de 100 en sous-tableau. Un nom qui n'est pas un
  code département connu va dans « non renseigné », quelle que soit la langue du compte Matomo, qui
  traduit le nom par défaut.
- **Source unique** (`acquisition/services/simulations-terminees.service.ts`) : entonnoir, top 5 et
  tableau en dérivent. La somme des départements et du non-renseigné fait exactement le total, pour
  toute période.
- **Historique** : les résultats envoyés avant cette décision n'ont pas de nom. Le tableau les montre
  dans une ligne « Département non renseigné ». Le filtre département bascule tout seul, sous-période
  par sous-période : il lit le nom quand tous les résultats en ont un, et sinon revient à la
  requête segmentée sur la dimension, comptée elle aussi en évènements. Aucune date de bascule n'est
  codée en dur.

## Options envisagées

### Option A — Évènements nommés par département, en `nb_events` (retenue)

- Avantages : additif par construction, donc le total tombe toujours juste ; une seule requête par
  sous-période ; le filtre département se lit sans segment, donc sans recalcul à la volée ni risque
  de timeout ; le suivi supprime au passage les réaffichages et les éditions.
- Inconvénients : un chiffre plus élevé que l'ancien, et une variation faussée tant que la période
  précédente contient des doublons ; aucune répartition par département pour l'historique.

### Option B — Garder les visites et documenter l'écart

- Avantages : aucun changement de suivi ; des chiffres stables.
- Inconvénients : un tableau dont le total ne correspond à rien, et un écart de 2 à 7 % qui change
  selon la période. `flat=0` ne règle rien : Matomo y additionne lui aussi les lignes par URL
  (totaux identiques, vérifié).

### Option C — Une requête segmentée par département

- Avantages : des visites distinctes par département, sur tout l'historique.
- Inconvénients : deux à trois minutes par département, une centaine de départements. Inutilisable
  à l'écran, et une charge inutile sur l'instance Matomo partagée de beta.gouv. La somme resterait
  supérieure au total, à cause des visites sur plusieurs départements.

## Conséquences

### Positives

- Total de l'entonnoir = somme du tableau = somme des top 5, à l'unité près.
- Le filtre département n'émet plus de requête segmentée dès que la période est postérieure au
  déploiement.
- Les éditions et les réaffichages ne gonflent plus les simulations, ni les étapes du tunnel.

### Négatives / Risques

- **Les chiffres montent** : sur 30 jours d'historique, environ 13 800 simulations au lieu de 8 100
  visites, soit environ 1,6 évènement par visite. Le taux simulations → comptes baisse d'autant.
- **La variation est faussée pendant une période** : la période précédente contient encore les
  doublons.
- **La page publique `/stats` compte toujours des visites** (`getSimulationsTotals`). Elle affiche
  donc un chiffre inférieur au back-office sous le même libellé. L'aligner est une décision produit,
  hors de cette décision (cf. `docs/stats/STATISTIQUES.md`, « Écarts connus »).
- Le top 5 des communes reste sur le rapport de la dimension commune, en visites : un évènement ne
  porte qu'un nom.
- Un résultat sans département après le déploiement fait revenir sa sous-période au calcul segmenté.
  Le résultat reste juste, mais la requête est plus lente.

### Migration

Aucune donnée à migrer. La répartition par département se remplit à partir du déploiement. La ligne
« non renseigné » se vide d'elle-même à mesure que les fenêtres affichées ne couvrent plus que des
jours postérieurs au déploiement.

## Liens

- Suivi : `src/features/simulateur/components/SimulateurFormulaire.tsx`,
  `src/features/simulateur/domain/utils/suivi-resultat.ts`
- Lecture : `src/features/backoffice/administration/acquisition/adapters/matomo-api.adapter.ts`
  (`fetchMatomoSimulationsTerminees`), `acquisition/domain/simulations-terminees.ts`
- Source unique : `acquisition/services/simulations-terminees.service.ts`,
  `tableau-de-bord/services/tableau-de-bord.service.ts` (`getSimulationsMatomo`,
  `getTopDepartementsMatomo`)
- Affichage : `src/app/(backoffice)/administration/acquisition/components/simulateur/SimulationsParDepartementTable.tsx`
- Documentation : [docs/stats/STATISTIQUES.md](../stats/STATISTIQUES.md), [ADR-0033](0033-granularite-events-matomo-dashboard.md)
- PR : MTES-MCT/fonds-prevention-argile#391
