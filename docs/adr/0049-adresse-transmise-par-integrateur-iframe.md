# ADR-0049 : Adresse transmise par l'intégrateur d'une iframe

**Date** : 2026-10-13
**Statut** : Accepté

## Contexte

Un partenaire qui intègre le simulateur en iframe (`/embed-simulateur`, `/embed-vulnerabilite-rga`)
connaît souvent l'adresse du logement de son utilisateur et doit pouvoir la préremplir. Le partage
d'adresse entre les deux simulateurs ([ADR-0048](0048-adresse-partagee-entre-simulateurs.md)) ne
sert pas ce besoin : il vient de l'usager, pas de l'intégrateur.

## Décision

> L'intégrateur ajoute `#adresse=<texte encodé>` (et en option `&rnb=XXXX-XXXX-XXXX`) à l'URL de
> l'iframe. Les deux étapes adresse le lisent côté client, résolvent le texte par la BAN et
> préremplissent l'étape.

- **Fragment, pas query string.** Une adresse est une donnée personnelle : le fragment n'atteint ni
  les journaux serveur ni le `Referer`. Matomo reçoit `discardHashTag`, pour qu'il ne l'enregistre
  pas non plus. Précédent : `#d=` pour les données RGA chiffrées.
- **Texte, pas identifiant.** L'intégrateur possède une adresse postale, rarement un RNB ou une clé
  BAN. Le RNB est un complément facultatif qui présélectionne le bâtiment.
- **Résolution prudente** (`resoudreAdresseTransmise`) : une réponse BAN de type numéro de rue,
  de score au moins 0,85 et à 0,05 au moins de la suivante est sélectionnée ; sinon le champ est
  prérempli et l'usager choisit. L'étape n'est jamais sautée, et l'usager peut changer d'adresse.
- **Entrée validée** : 5 à 200 caractères, caractères de contrôle retirés, RNB au format
  `XXXX-XXXX-XXXX` ou ignoré. Aucun envoi serveur, aucune écriture avant la validation de l'usager.
- **Priorité** : l'adresse transmise passe avant l'adresse reprise d'un autre simulateur
  (ADR-0048). Un test fait par un agent ou une simulation qui a déjà sa propre adresse l'ignorent.

## Options envisagées

- **`postMessage`** : aucune trace dans l'URL, mais l'intégrateur doit écrire du JavaScript et il
  faut une liste blanche d'origines. Gardé pour plus tard si un partenaire refuse toute donnée
  dans l'URL.
- **Paramètre `?adresse=`** : plus simple à lire côté serveur, mais l'adresse passerait par les
  journaux et le `Referer`.
- **RNB seul** : `getBuildingDataByRnbId` exige des coordonnées, qu'il faudrait demander à l'API
  RNB, et peu d'intégrateurs ont cet identifiant.
- **Clé BAN** : oblige l'intégrateur à géocoder.

## Conséquences

- Les seuils de résolution (0,85 et 0,05) sont à ajuster à l'usage.
- Un RNB mal associé à l'adresse n'est pas détecté : la carte ne présélectionne alors rien ou le
  bâtiment le plus proche, et l'usager le voit.
- Documenté pour les intégrateurs sur `/documentation/integration-iframe`.
