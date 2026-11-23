# ADR-0056 : Deux sources pour l'historique des catastrophes naturelles, et une table à part pour les décisions

**Date** : 2026-11-23
**Statut** : Accepté

## Contexte

Les pages commune du cocon SEO (`/rga/commune/…`) affichent les sécheresses reconnues en catastrophe
naturelle, importées de l'API Géorisques (base GASPAR). Deux manques :

- **Géorisques ne publie que les reconnaissances.** Une commune qui a demandé la reconnaissance sans
  l'obtenir n'y figure pas, alors que l'information intéresse autant ses habitants : sur l'arrêté du
  11 mai 2026, 130 de nos communes ont été refusées pour 34 reconnues.
- **Géorisques a du retard et des dates fausses.** L'arrêté paru le 21 novembre 2026 (977 communes
  reconnues en sécheresse, dont 95 des nôtres) n'y était pas deux jours plus tard, et les arrêtés
  publiés depuis 2025 y sont datés un jour trop tôt (`docs/ops/import-catnat.md`).

Trois sources donnent les décisions commune par commune, refus compris :

| Source                                                | Refus depuis  | Accès                                                   |
| ----------------------------------------------------- | ------------- | ------------------------------------------------------- |
| Annexes des arrêtés au Journal officiel               | l'origine     | PDF, sans format exploitable                            |
| Portail de la CCR (`ccr.fr`, page « Arrêtés »)        | au moins 2006 | point d'accès interne du site, sans API ni licence lue  |
| Jeu data.gouv « Décisions de catastrophe naturelle… » | juillet 2025  | CSV, licence ouverte 2.0, producteur privé (ClimaScore) |

La CCR a été contactée le 23 novembre 2026 pour un export ou un accord de réutilisation.

## Décision

> Nous gardons Géorisques comme source des reconnaissances, et nous importons les décisions du jeu
> data.gouv dans une table à part, `catnat_decisions`, réunie à la première au moment de l'affichage.

- **Une table par source de vérité.** `catastrophes_naturelles` reste le reflet de Géorisques, avec son
  code NOR. `catnat_decisions` porte les décisions (reconnue ou non reconnue, motif du refus) et une
  colonne `source` : l'historique de la CCR pourra s'y ajouter sans migration.
- **La fusion se fait à la lecture**, par une fonction pure (`fusionnerHistorique`,
  `src/features/seo/catnat/domain/historique.ts`). Une reconnaissance connue des deux sources n'apparaît
  qu'une fois, avec le code NOR de Géorisques et les dates du jeu data.gouv, qui sont celles du Journal
  officiel. Le rapprochement se fait sur la commune, la date de l'arrêté et le début de la période, à un
  jour près : 111 reconnaissances sur 112 se rapprochent ainsi le 23 novembre 2026, la dernière manque à
  Géorisques.
- **Une reconnaissance absente de Géorisques est affichée quand même**, sans code NOR : c'est ce qui
  rend l'arrêté du 21 novembre visible sans attendre. Elle prend son code NOR dès que Géorisques la
  publie.
- **Seule la sécheresse est importée**, sur le libellé officiel du phénomène, et seulement pour les
  communes du cocon SEO.
- **L'import est rejoué chaque lundi** par le cron des arrêtés, après Géorisques et indépendamment de
  lui. Il retire les décisions que le jeu ne publie plus, sauf si une ligne du fichier est illisible ou
  si le fichier ne contient plus aucune décision pour nos communes.

## Options envisagées

### Option A — Table des décisions à part, fusion à la lecture (retenue)

- Avantages : aucune donnée de Géorisques n'est réécrite, les compteurs par département et par EPCI
  restent ceux des reconnaissances ; la correction des dates disparaît d'elle-même si Géorisques se
  corrige ; changer de source ne touche pas l'affichage.
- Inconvénients : deux lectures par page commune ; une règle de rapprochement à maintenir.

### Option B — Tout écrire dans `catastrophes_naturelles`

- Avantages : une seule table, une seule lecture.
- Inconvénients : la clé contient le code NOR, que le jeu data.gouv n'a pas ; les refus entreraient dans
  les compteurs « N épisodes de sécheresse classés » ; corriger les dates à l'import ferait diverger la
  table de sa source et rejouerait la correction à chaque import.

### Option C — Importer l'historique depuis le portail de la CCR

- Avantages : refus depuis au moins 2006, données d'un réassureur public.
- Inconvénients : aucun point d'accès documenté ni conditions de réutilisation lues ; pas de motif de
  refus. À reprendre selon la réponse de la CCR.

## Conséquences

### Positives

- Le tableau des pages commune distingue les demandes reconnues des demandes non reconnues, avec le
  motif du refus.
- Le site suit le Journal officiel à quelques jours près, sans dépendre du délai de Géorisques.
- Les dates affichées sont celles de l'arrêté.

### Négatives / Risques

- **Dépendance à un producteur privé**, sans engagement de continuité. Si le jeu disparaît ou change de
  format, l'import échoue et le dit dans les logs ; les décisions déjà importées restent affichées.
- **Le motif affiché est un résumé rédigé par le producteur**, pas la motivation de l'arrêté.
- **Les refus antérieurs à juillet 2025 sont absents** : l'interface le dit.
- **Les compteurs des pages département et EPCI ne comptent pas** les reconnaissances que Géorisques n'a
  pas encore.

## Liens

- Import et rapprochement : `src/features/seo/catnat/` (`adapters/datagouv/`, `domain/historique.ts`,
  `services/decisions-catnat.service.ts`)
- Table : `src/shared/database/schema/catnat-decisions.ts`
- Exploitation : [`docs/ops/import-catnat.md`](../ops/import-catnat.md)
- Jeu de données :
  <https://www.data.gouv.fr/datasets/decisions-de-catastrophe-naturelle-publiees-au-journal-officiel-communes-reconnues-et-refusees/>
- Sujets reportés : [`docs/SUJETS-A-TRAITER.md`](../SUJETS-A-TRAITER.md)
