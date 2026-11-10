# Import Excel des structures

La page `/administration/structures` a trois onglets d'import, un par rôle : **Import AMO**, **Import
Aller-vers** et **Import experts** (ce dernier pour le super-administrateur seulement). Chacun propose
son modèle (`public/templates/{amo,allers-vers,experts}-exemple.xlsx`), dont la seconde feuille,
« Mode d'emploi », décrit chaque colonne
([ADR-0053](../adr/0053-identite-portee-par-la-structure.md)).

## Le SIRET désigne la structure

Chaque ligne porte un SIRET, obligatoire. Il désigne la structure **du type du rôle** :

| Import     | Type de structure | Si aucune structure de ce SIRET n'existe                                             |
| ---------- | ----------------- | ------------------------------------------------------------------------------------ |
| AMO        | accompagnement    | un Aller-vers encore sans SIRET, de même nom sur un département commun ; sinon créée |
| Aller-vers | accompagnement    | idem                                                                                 |
| Experts    | expert            | créée                                                                                |

- Une structure expert ne fait que de l'expertise : une société aussi AMO a une seconde structure, de
  type expert, du même SIRET.
- Le rapprochement par le nom ne sert qu'à passer le cap du premier import : aucun Aller-vers n'avait
  de SIRET. La structure retrouvée reçoit le SIRET du fichier, signalé dans le bilan. Un nom qui
  désigne plusieurs structures est refusé : renseigner le SIRET dans la bonne fiche, puis réimporter.
- Un expert peut tenir sur plusieurs lignes de même SIRET, une par contact de réservation, expert sur
  place ou forfait différent. Une AMO ou un Aller-vers décrit deux fois, ou un département d'expert
  déclaré deux fois, refuse la ligne qui le répète.

## Colonnes

| Import     | Colonnes                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tous       | `nom`, `siret`, `adresse`, `telephone`, `horaires`                                                                                                                |
| AMO        | `departements` (« Indre 36, Cher 18 »), `emails`, `epci`, `communes` (ou `codes_insee`)                                                                           |
| Aller-vers | `departements` (codes), `emails`, `epci`                                                                                                                          |
| Experts    | `departements`, `email_reservation`, `telephone_reservation`, `expert_sur_place_*`, `forfait_diag`, `forfait_reseau`, `date_validation_dhup`, `contact_interne_*` |

Les en-têtes sont reconnus sans tenir compte de la casse, des accents ni des tirets bas ; ceux des
anciens fichiers AMO et Aller-vers restent valables. Emails, départements, EPCI et codes INSEE
acceptent `,` et `;`. Excel lit `03` et `0612345678` comme des nombres et retire le zéro : l'import le
rétablit.

## Ce que le fichier peut écrire

- **L'habilitation du rôle importé** : son territoire et ses emails sont remplacés par ceux du fichier ;
  pour un expert, ses départements, contacts de réservation, experts sur place et forfaits. Une date
  de validation ou un contact interne absent du fichier ne retire pas celui de la fiche.
- **L'identité d'une structure existante** (nom, adresse, téléphone, horaires) n'est que complétée.
  Une valeur différente est signalée dans le bilan, sans être reprise. Cocher **« Remplacer les
  coordonnées des structures existantes »** remplace ces champs par les cellules remplies du fichier ;
  le bilan liste ce qui a été remplacé. Le SIRET n'est jamais remplacé.
- **Rien n'est supprimé.** Retirer une habilitation ou supprimer une structure se fait dans sa fiche.
- La **zone affichée au public** d'un Aller-vers (titre de son groupe sur « Trouver mon conseiller
  local ») ne s'importe pas : elle se saisit dans la fiche, et un import la laisse inchangée.
- Ajouter l'AMO ou l'Aller-vers à une structure **qui a des agents** leur donne ce rôle : réservé au
  super-administrateur. Pour un administrateur, la ligne est refusée et listée, les autres passent.

## Bilan

Structures créées et déjà connues, habilitations ajoutées et mises à jour, puis les lignes refusées
avec leur motif et les avertissements. Chaque structure s'enregistre dans sa propre transaction : une
erreur n'arrête pas les autres.

## Fichier de la DHUP

Dans l'import experts, ses en-têtes (`Société`, `SIRET/SIREN`, `départements d'intervention`, `Contact`,
`adresse mail`, `n° téléphone`, `adresse postale`) sont lus tels quels. Son email et son téléphone sont
ceux de la **réservation**, rattachés aux départements de la ligne ; `Contact` devient le contact
interne. La raison sociale ne remplace pas le nom d'une structure existante, sauf sur demande.

## Modèles

`npx tsx scripts/dev/generer-modeles-import-structures.ts` régénère les trois modèles. Un test
(`import-structures.test.ts`) vérifie que chacun s'importe sans refus.
