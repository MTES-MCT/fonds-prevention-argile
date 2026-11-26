# ADR-0056 : Deux sources comparées pour l'historique des catastrophes naturelles, la plus à jour retenue

**Date** : 2026-11-23
**Statut** : Accepté

## Contexte

Les pages commune du cocon SEO (`/rga/commune/…`) affichent les sécheresses reconnues en catastrophe
naturelle, importées de l'API Géorisques (base GASPAR). Deux manques :

- **Géorisques ne publie que les reconnaissances.** Une commune qui a demandé la reconnaissance sans
  l'obtenir n'y figure pas, alors que l'information intéresse autant ses habitants : sur l'arrêté du
  11 mai 2026, 130 de nos communes ont été refusées pour 34 reconnues.
- **Géorisques a du retard et des dates fausses.** L'arrêté paru le 21 novembre 2026 (977 communes
  reconnues en sécheresse, dont 95 des nôtres) n'y est entré qu'entre le 23 et le 26, et 111 des
  reconnaissances publiées depuis 2025 y sont datées un jour trop tôt (`docs/ops/import-catnat.md`).

Trois sources donnent les décisions commune par commune, refus compris :

| Source                                                | Refus depuis  | Accès                                                   |
| ----------------------------------------------------- | ------------- | ------------------------------------------------------- |
| Annexes des arrêtés au Journal officiel               | l'origine     | PDF, sans format exploitable                            |
| Portail de la CCR (`ccr.fr`, page « Arrêtés »)        | au moins 2006 | point d'accès interne du site, sans API ni licence lue  |
| Jeu data.gouv « Décisions de catastrophe naturelle… » | juillet 2025  | CSV, licence ouverte 2.0, producteur privé (ClimaScore) |

La CCR a été contactée le 23 novembre 2026 pour un export ou un accord de réutilisation.

Le jeu data.gouv est une ressource distante : data.gouv ne fait que rediriger vers le fichier servi par
son producteur. La date affichée sur sa fiche est celle de la dernière analyse par data.gouv (29 octobre
le 23 novembre 2026), pas celle du fichier, modifié le 21.

## Décision

> Nous importons les deux sources, chacune dans sa table, nous les comparons, et le site affiche la plus
> à jour : une reconnaissance dès que l'une des deux la publie, et la plus tardive des deux dates quand
> elles diffèrent.

- **Une table par source.** `catastrophes_naturelles` reste le reflet de Géorisques, avec son code NOR.
  `catnat_decisions` porte les décisions du jeu data.gouv (reconnue ou non reconnue, motif du refus) et
  une colonne `source` : l'historique de la CCR pourra s'y ajouter sans migration.
- **La comparaison se fait à la lecture**, par des fonctions pures (`rapprocher`,
  `src/features/seo/catnat/domain/rapprochement.ts`). Deux lignes sont la même reconnaissance quand la
  commune, la date de l'arrêté et le début de la période concordent, à un jour près.
- **Présence : aucune source n'a la priorité.** Une reconnaissance publiée par une seule source est
  affichée. Venue du jeu data.gouv seul, elle n'a pas de code NOR et le prend quand Géorisques la publie.
- **Contenu : la plus tardive de chaque date.** Pour une reconnaissance publiée par les deux, le code NOR
  vient de Géorisques, seul à l'avoir ; le début, la fin et la parution sont chacun la plus tardive des
  deux valeurs. Aucune source ne date ses lignes : on ne peut pas savoir laquelle a été modifiée en
  dernier, et le seul écart connu est le jour d'avance de Géorisques.
- **Les refus viennent du jeu data.gouv**, Géorisques n'en publiant pas.
- **Les compteurs des pages département et EPCI suivent la même règle** : les arrêtés de Géorisques, plus
  ceux que seul le jeu data.gouv connaît, reconnus à leur date faute de code NOR
  (`compterEpisodesReconnus`).
- **La comparaison est tracée à chaque import** (`comparerSources`) : reconnaissances identiques, à un
  jour d'écart, propres à chaque source, et dernier Journal officiel connu de chacune. Une source à plus
  de 15 jours derrière l'autre sort en erreur.
- **Seule la sécheresse est importée**, sur le libellé officiel du phénomène, et seulement pour les
  communes du cocon SEO.
- **L'import est rejoué chaque lundi** par le cron des arrêtés, après Géorisques et indépendamment de
  lui. Il retire les décisions que le jeu ne publie plus, sauf si une ligne du fichier est illisible ou
  si le fichier ne contient plus aucune décision pour nos communes.

## Options envisagées

### Option A — Une table par source, comparaison à la lecture (retenue)

- Avantages : aucune donnée d'une source n'est réécrite ; la correction des dates disparaît d'elle-même
  si Géorisques se corrige ; le site reste à jour si l'une des deux sources décroche ; changer de source
  ne touche pas l'affichage.
- Inconvénients : deux lectures par page ; une règle de rapprochement à maintenir.

### Option B — Tout écrire dans `catastrophes_naturelles`

- Avantages : une seule table, une seule lecture.
- Inconvénients : la clé contient le code NOR, que le jeu data.gouv n'a pas ; les refus entreraient dans
  les compteurs « N épisodes de sécheresse classés » ; corriger les dates à l'import ferait diverger la
  table de sa source et rejouerait la correction à chaque import.

### Option C — Retenir, ligne par ligne, la source modifiée en dernier

- Avantages : lecture littérale de « la plus récente ».
- Inconvénients : aucune des deux sources ne date ses lignes, il faudrait le déduire de nos imports ; et
  si Géorisques décalait d'un jour une ligne jusque-là juste, sa version fausse l'emporterait.

### Option D — Importer l'historique depuis le portail de la CCR

- Avantages : refus depuis au moins 2006, données d'un réassureur public.
- Inconvénients : aucun point d'accès documenté ni conditions de réutilisation lues ; pas de motif de
  refus. À reprendre selon la réponse de la CCR.

## Conséquences

### Positives

- Le tableau des pages commune distingue les demandes reconnues des demandes non reconnues, avec le
  motif du refus.
- Le site suit le Journal officiel à quelques jours près, sans dépendre du délai d'une seule source.
- Les dates affichées sont celles de l'arrêté : sur les 206 reconnaissances publiées par les deux sources
  le 26 novembre 2026, 95 sont identiques et 111 diffèrent d'un jour, toujours dans le même sens.
- Un décrochage d'une source se voit dans les logs de l'import, sans attendre qu'un usager le signale.

### Négatives / Risques

- **Dépendance à un producteur privé**, sans engagement de continuité. Si le jeu disparaît ou change de
  format, l'import échoue et le dit dans les logs ; les décisions déjà importées restent affichées.
- **Le motif affiché est un résumé rédigé par le producteur**, pas la motivation de l'arrêté.
- **Les refus antérieurs à juillet 2025 sont absents** : l'interface le dit.
- **« La plus tardive » ne corrige qu'une avance.** Une source qui donnerait une date un jour trop tard
  l'emporterait à tort. Jamais observé sur les 206 reconnaissances comparées.
- **Un écart de plus d'un jour n'est pas rapproché** : la reconnaissance apparaît deux fois, et compte
  dans « propres à chaque source » de la comparaison.

## Liens

- Import et comparaison : `src/features/seo/catnat/` (`adapters/datagouv/`, `domain/rapprochement.ts`,
  `domain/historique.ts`, `domain/comparaison-sources.ts`, `services/decisions-catnat.service.ts`)
- Table : `src/shared/database/schema/catnat-decisions.ts`
- Exploitation : [`docs/ops/import-catnat.md`](../ops/import-catnat.md)
- Jeu de données :
  <https://www.data.gouv.fr/datasets/decisions-de-catastrophe-naturelle-publiees-au-journal-officiel-communes-reconnues-et-refusees/>
- Sujets reportés : [`docs/SUJETS-A-TRAITER.md`](../SUJETS-A-TRAITER.md)
