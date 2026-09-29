# Import Excel des structures AMO et Allers-Vers

Les pages `/administration/amo` et `/administration/allers-vers` importent un fichier Excel
(modèle téléchargeable sur chaque page). Tout ce qui suit vaut pour les deux, sauf mention.

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

## Colonnes à plusieurs valeurs

Emails, départements, EPCI et codes INSEE acceptent indifféremment `,` et `;`, dans le
fichier comme dans les modales d'édition. Les emails AMO sont stockés séparés par `;`
quelle que soit la saisie.
