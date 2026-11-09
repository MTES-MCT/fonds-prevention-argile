# ADR-0053 : Identité et type portés par la structure, une fiche par structure

**Date** : 2026-11-09
**Statut** : Accepté

## Contexte

L'ADR-0051 a créé la table `structures`, mais a laissé nom, SIRET, adresse, téléphone et horaires
sur chaque ligne d'habilitation (`entreprises_amo`, `allers_vers`, `experts`). Rien ne garantissait
leur cohérence : un demandeur suivi par une structure à la fois AMO et Aller-vers voyait les
coordonnées de l'Aller-vers, puis celles de l'AMO une fois attribuée (attributs Brevo `CONSEILLER_*`,
`/mon-compte`). L'administration gardait quatre onglets (Structures, AMO, Allers Vers, Experts) et
trois outils de transition (renommer, fusionner, détacher).

Mesuré sur la restauration de la production du 4 novembre 2026, sur les 12 structures à la fois AMO
et Aller-vers : adresse et horaires ne divergent jamais, le téléphone diffère sur 1 structure, le nom
sur 2 (3 autres à la mise en forme près), les emails sur 4. Ces emails sont des équipes : l'équipe AMO
et l'équipe Aller-vers d'une même structure ne sont pas forcément les mêmes personnes.

Côté métier, enfin : une structure expert ne fait que de l'expertise, une structure n'existe pas sans
rôle, et les fichiers arrivent par rôle (liste des AMO, des Aller-vers, référencement DHUP des experts).

## Décision

> La structure porte son type et son identité (nom, SIRET, adresse, téléphone, horaires), recopiée
> sur chacune de ses lignes d'habilitation ; chaque habilitation garde son territoire et ses contacts.

- **Type** (`structures.type`), fixé à la création : `accompagnement` (AMO et/ou Aller-vers) ou
  `expert` (l'expertise seule). Une société à la fois AMO et experte a deux structures, du même
  SIRET : l'unicité porte sur le couple (type, SIRET). Seule une structure d'accompagnement reçoit des
  agents ; l'expert n'a pas de compte pour l'instant.
- **Jamais de structure sans habilitation** : une structure naît avec sa première habilitation, qui
  fixe son type ; la dernière ne se retire pas. Supprimer une structure emporte ses habilitations, et
  reste refusé tant qu'elle a des agents ou que son AMO suit des dossiers.
- **Identité** : `siret` (facultatif), `adresse`, `telephone`, `horaires`. Le SIRET est exigé pour une
  habilitation AMO (le formulaire DN le reprend) ou expert (la liste DHUP en dépend). Il n'est contrôlé
  que sur ses 14 chiffres : 5 des 18 SIRET d'AMO en base ne passent pas la clé de contrôle.
- **Une seule écriture de l'identité** : `structuresRepository.mettreAJourIdentite`, qui met à jour la
  structure puis la recopie sur ses lignes, dans la même transaction. Les dépôts d'habilitation ne
  savent plus l'écrire ; une ligne ajoutée reprend celle de sa structure. Les **lecteurs ne changent
  pas** : ils lisent la copie, toujours égale à la structure.
- **Lien rôle–structure** : une table par rôle, chacune avec ses informations propres —
  `entreprises_amo` (territoire : départements, `_epci`, `_communes` ; équipe), `allers_vers`
  (`_departements`, `_epci` ; équipe), `experts` (contact interne, validation DHUP, désactivation) et
  `experts_departements` (contacts de réservation).
- **Trois imports, un par rôle**, chacun avec son modèle (`public/templates/{amo,allers-vers,experts}-exemple.xlsx`).
  Le SIRET, obligatoire, désigne la structure du type du rôle ; à défaut, elle est créée. Un
  Aller-vers encore sans SIRET est retrouvé par son nom et un département commun, puis reçoit le
  SIRET du fichier. Le fichier de la DHUP est accepté tel quel. Le fichier fait foi pour
  l'habilitation ; l'identité d'une structure existante n'est que complétée, sauf si la case
  « Remplacer les coordonnées » est cochée (le SIRET jamais). Rien n'est supprimé.
- **Un seul onglet « Structures »** : une liste filtrable, une fiche par structure (identité, une carte
  par habilitation, agents), et les trois onglets d'import. Les pages AMO, Aller-vers et Experts
  redirigent vers la liste filtrée. Renommer, fusionner et détacher disparaissent.
- **Territoire saisi dans des listes**, à l'écran : départements et EPCI se choisissent dans des
  listes déroulantes à recherche. Les EPCI viennent de l'API Géo (nom, départements), mise en cache
  une journée ; elle sert aussi à les nommer sur la fiche. Les départements de l'AMO restent stockés
  en texte, écrit au format « Indre 36, Cher 18 » que lit sa couverture.
- Droits : administrateur et super-administrateur. Ajouter ou retirer une habilitation AMO ou
  Aller-vers sur une structure **qui a des agents** change leurs rôles : réservé au
  super-administrateur, à l'écran comme à l'import. Tout ce qui touche aux experts reste au
  super-administrateur (`EXPERTS_WRITE`).

## Options envisagées

### Option A — Identité sur la structure, recopiée sur les lignes (retenue)

- Avantages : une seule source modifiable ; aucun des ~30 lecteurs (parcours AMO, Brevo, pages
  publiques, espace agent) ne change ; un retour arrière retrouve des lignes à jour.
- Inconvénients : une copie dénormalisée, que seule la discipline d'écriture garde exacte.

### Option B — Identité sur la structure, lue par jointure

- Avantages : aucune copie.
- Inconvénients : ~30 lecteurs à reprendre, et la copie reste nécessaire tant qu'un retour à l'ancien
  code doit rester possible.

### Option C — Une table générique du lien rôle–structure

- Avantages : un seul modèle pour les trois rôles.
- Inconvénients : les informations diffèrent d'un rôle à l'autre, et les 1 938 validations AMO
  pointent vers `entreprises_amo` par clé étrangère.

### Option D — Un import unique pour les trois rôles

- Avantages : un seul fichier, un seul bouton.
- Inconvénients : le métier reçoit et pense les listes par rôle ; un fichier commun mêle des colonnes
  sans rapport et s'éloigne du référencement de la DHUP.

## Conséquences

### Positives

- Un demandeur voit les mêmes coordonnées, qu'il soit suivi par l'AMO ou par l'Aller-vers.
- Un import ne crée plus de structure en double : plus besoin de fusion.
- Une seule page pour administrer une structure, ses habilitations et ses agents, et tout y corriger
  à la main après la migration.

### Négatives / Risques

- Trois écarts sont tranchés par la migration au profit de l'AMO : le téléphone de Soliha métropole
  Nord, les noms de Soliha 03 et de Soliha Dordogne. À vérifier puis corriger dans la fiche.
- Un import ne supprime plus : retirer une habilitation ou supprimer une structure se fait dans sa
  fiche.
- L'administrateur ne peut plus donner un rôle aux agents d'une structure en lui ajoutant une
  habilitation : il passe par un super-administrateur.
- Les départements de l'AMO restent du texte libre en base, contrairement à ceux de l'Aller-vers et
  de l'expert ; leur normalisation est reportée (`docs/SUJETS-A-TRAITER.md`). La fiche réécrit ce
  texte au format canonique dès qu'on enregistre l'habilitation.
- Sans l'API Géo, la liste des EPCI est vide : ceux déjà choisis restent affichés par leur code et
  se retirent, mais aucun ne s'ajoute à l'écran (l'import, lui, n'en dépend pas).

### Migration

Migration `0061`, dans une seule transaction :

1. Un expert réuni à une AMO ou à un Aller-vers repart dans sa propre structure, de type `expert` ;
   toute structure qui porte un expert devient de type `expert`.
2. Identité reprise de l'AMO, à défaut de l'Aller-vers ; SIRET de l'AMO, ou de l'expert pour une
   structure expert.
3. Unicité de (type, SIRET), puis copie de l'identité sur toutes les lignes.
4. Les triggers transitoires de l'ADR-0051 donnent à une structure créée par l'ancien code
   l'identité de la ligne insérée.

Le seed rejoue les mêmes règles (`scripts/seed/sql/amo-av/aligner-identite-structures.sql`).
Retour arrière : redéployer la version précédente suffit, les lignes portant l'identité à jour.

Les trois PR de la pile (#441, #442 et celle-ci) se déploient en production ensemble : ainsi la fusion
et le détachement n'y arrivent jamais, et l'import des experts crée déjà des structures expert.

## Liens

- ADR liées : [ADR-0051](0051-roles-amo-aller-vers-portes-par-la-structure.md), [ADR-0052](0052-annuaire-des-experts-ordre-neutre.md)
- Schéma et migration : `src/shared/database/schema/structures.ts`, `src/shared/database/migrations/0061_identite_structure.sql`
- Écriture : `src/shared/database/repositories/structures.repository.ts` (`mettreAJourIdentite`)
- Règles et service : `src/features/backoffice/administration/structures/domain/regles-structures.ts`,
  `domain/import-structures.ts`, `services/structures-admin.service.ts`, `services/import-structures.service.ts`
- Écran : `src/app/(backoffice)/administration/structures/`
- Référentiel des EPCI : `src/shared/adapters/geo/geo.adapter.ts` (`fetchEpcis`), `services/referentiel-epci.service.ts`
- Documentation : [RBAC-ROLES](../security/RBAC-ROLES.md), [DONNEES-PERSONNELLES](../security/DONNEES-PERSONNELLES.md), [import-structures](../ops/import-structures.md)
