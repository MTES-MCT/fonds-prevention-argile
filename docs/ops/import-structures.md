# Import Excel des structures AMO, Allers-Vers et experts

Les pages `/administration/amo` et `/administration/allers-vers` importent un fichier Excel
(modèle téléchargeable sur chaque page). Tout ce qui suit vaut pour les deux, sauf mention. Les
experts ont leurs propres règles, en fin de page.

## Réimporter met à jour, sans dupliquer

Chaque ligne est rapprochée d'une structure existante par une **clé naturelle** :

| Structure   | Clé                                                    | Si elle existe déjà                       |
| ----------- | ------------------------------------------------------ | ----------------------------------------- |
| AMO         | SIRET                                                  | mise à jour                               |
| Allers-Vers | nom normalisé **et** au moins un département en commun | mise à jour                               |
| Allers-Vers | plusieurs structures correspondent                     | ligne ignorée, à corriger depuis la liste |
| Allers-Vers | deux lignes du fichier désignent la même structure     | la seconde est ignorée                    |

Le nom normalisé ignore la casse, les accents et la ponctuation : « Allers-Vers Héraut » et
« allers vers heraut » sont la même structure. Le département est nécessaire parce que des
structures distinctes portent le même nom (« Soliha » en Dordogne et en Meurthe-et-Moselle).
Une structure qui gagne un département reste reconnue.

> **Renommer une structure dans le fichier en crée une nouvelle** (Allers-Vers). Pour un
> renommage, modifier d'abord le nom depuis la liste, puis réimporter.

Sur une structure mise à jour, le fichier fait foi : départements, EPCI et communes absents
du fichier sont retirés.

## « Supprimer les structures non rattachées avant l'import »

La case ne vide plus tout. Elle supprime seulement les structures qu'aucune donnée ne
référence, et le résultat de l'import nomme celles conservées.

| Structure   | Conservée si…                                                      |
| ----------- | ------------------------------------------------------------------ |
| AMO         | un agent y est rattaché, ou un dossier (validation AMO) la désigne |
| Allers-Vers | un agent y est rattaché (désactivé compris)                        |

Supprimer ces structures rendait les agents concernés inexploitables (`calculateAgentScope`
lève faute de structure) et, côté AMO, échouait sur la contrainte des validations. Les
structures conservées sont ensuite mises à jour par l'import si elles figurent dans le fichier.

La case exige en plus la permission de suppression (`AMO_DELETE` / `ALLERS_VERS_DELETE`).

## Structure de rattachement

Une AMO ou un Aller-vers créé par l'import devient sa propre structure, avec ce seul rôle
([ADR-0051](../adr/0051-roles-amo-aller-vers-portes-par-la-structure.md)). Quand une même
organisation est AMO et Aller-vers, fusionner ses deux structures sur
`/administration/structures` : ses agents en recevront les deux rôles.

## Colonnes à plusieurs valeurs

Emails, départements, EPCI et codes INSEE acceptent indifféremment `,` et `;`, dans le
fichier comme dans les modales d'édition. Les emails AMO sont stockés séparés par `;`
quelle que soit la saisie.

## Experts (`/administration/experts`, super-administrateur)

L'onglet « Import » de la page reprend l'écran des AMO et des Aller-vers, sans la case de purge.
L'import lit le référencement transmis par la DHUP tel quel (`Société`, `SIRET/SIREN`,
`départements d'intervention`, `Contact`, `adresse mail`, `n° téléphone`), ou le modèle de la page,
qui ajoute la date de validation DHUP et le contact interne. Les en-têtes sont reconnus sans tenir
compte de la casse ni des accents ; `adresse postale` est ignorée, l'application ne la stocke pas.

| Colonne                                          | Devient                                                         |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `Société`                                        | raison sociale                                                  |
| `SIRET/SIREN`                                    | SIRET : 14 chiffres et clé valide, sinon la ligne est refusée   |
| `départements d'intervention`                    | codes, séparés par `,` ou `;` ; un code inconnu refuse la ligne |
| `adresse mail`, `n° téléphone`                   | contact de réservation de chacun des départements de la ligne   |
| `Contact`, `Contact interne email` / `téléphone` | contact interne, visible du seul super-administrateur           |
| `Date de validation DHUP`                        | date, au format `AAAA-MM-JJ` ou `JJ/MM/AAAA`                    |

- **Une ligne par expert, ou par département** quand le contact change d'un département à l'autre :
  les lignes d'un même SIRET sont réunies. Un département déjà déclaré plus haut pour ce SIRET refuse
  la ligne qui le répète.
- **Rapprochement par SIRET.** Un expert existant est mis à jour : ses départements sont remplacés par
  ceux du fichier ; sa date et son contact interne ne sont remplacés que si le fichier en donne. Son
  statut (actif ou désactivé) ne change pas.
- **Aucune suppression** : un expert absent du fichier reste tel quel. Un départ se traite par la
  désactivation, depuis la liste.
- Excel lit `03` et `0612345678` comme des nombres et retire le zéro : l'import le rétablit.
- Chaque ligne refusée est listée avec son numéro et son motif ; les autres sont enregistrées.

Un expert créé, par l'import ou à la main, devient sa propre structure. Une AMO qui est aussi expert
se fusionne avec sa fiche expert sur `/administration/structures` : cette habilitation ne change le
rôle d'aucun agent ([ADR-0052](../adr/0052-annuaire-des-experts-ordre-neutre.md)).
