# ADR-0054 : Avis de satisfaction, formulaire interne et lien commun

**Date** : 2026-11-16
**Statut** : Accepté

## Contexte

On a peu de retours des demandeurs sur les étapes du parcours, et on ne peut pas les appeler un à un.
Le besoin : savoir si une étape s'est bien passée et, sinon, ce qui a bloqué. Un NPS mesure la
recommandation, pas la facilité d'usage, et nos volumes sont trop faibles pour qu'il soit fiable.

La première piste était un mail Brevo renvoyant vers un formulaire Tally. Elle ajoutait un sous-traitant
pour un champ libre, et laissait les réponses hors de l'application, sans lien avec le parcours.

## Décision

> Un **micro-questionnaire interne** : une note de 1 à 5 (« Très difficile » à « Très facile »), puis
> « Qu'est-ce qui a posé problème ? » pour les notes 1 et 2. Le mail Brevo ne porte que des **liens**,
> les mêmes pour tous : `/avis?etape=<étape>&note=<1-5>&p={{ contact.PARCOURS_ID }}`.

- Une table `avis` pour sept sujets : six étapes (`compte`, `choix_amo`, `eligibilite`, `diagnostic`,
  `devis`, `factures`) et le simulateur. Un avis d'étape est rattaché au parcours, un avis sur le
  simulateur est anonyme (résultat et département seulement).
- Un avis par parcours et par étape : une nouvelle réponse remplace la précédente.
- La note cliquée dans le mail est enregistrée à l'ouverture de la page, par le navigateur : elle compte
  même si la page est refermée, et un antivirus de messagerie qui précharge le lien sans exécuter le
  script n'écrit rien.
- Les envois sont des Automations Brevo branchées sur les évènements déjà émis (`demandeur_cree`,
  `amo_reponse`, `dn_update`) : aucun code de déclenchement.
- Une réponse est acceptée même si le parcours n'a pas atteint l'étape du lien : le lien ne vient que de
  nos mails.

## Options envisagées

### Lien commun avec l'identifiant du parcours — (retenue)

- Avantages : un seul gabarit par étape, aucun jeton à créer ni à stocker, `PARCOURS_ID` est déjà un
  attribut de contact. On garde le croisement (département, accompagnement) et une réponse par parcours.
- Inconvénients : qui connaît l'identifiant d'un parcours peut déposer ou remplacer son avis. Il ne
  permet rien d'autre : la page n'affiche et ne renvoie aucune donnée du dossier.

### Lien strictement identique, réponse anonyme

- Avantages : le plus simple, aucune donnée rattachée.
- Inconvénients : ni croisement, ni dédoublonnage, et n'importe qui peut fausser les chiffres d'une étape.

### Jeton par envoi

- Avantages : lien non devinable, taux de réponse mesuré dans l'application.
- Inconvénients : une ligne et un jeton à créer à chaque déclencheur, donc du code dans six flux, pour un
  risque qui se limite à une note de satisfaction.

### Formulaire Tally

- Avantages : rien à développer.
- Inconvénients : sous-traitant de plus, réponses hors de l'application.

## Conséquences

- L'action `enregistrerAvisAction` est publique, justifiée dans l'`ALLOWLIST` du test méta des actions :
  elle valide sa charge par Zod, n'écrit qu'une note et un commentaire borné, ne lit rien.
- Le commentaire est un texte libre : il est inventorié dans `DONNEES-PERSONNELLES.md` et remplacé à la
  restauration d'un dump. Le formulaire demande de ne pas y mettre d'information personnelle.
- La page est en `noindex` et `no-referrer` : son URL porte l'identifiant du parcours.
- Le taux de réponse se lit dans les statistiques d'envoi de Brevo, pas dans l'application.
- L'avis sur le simulateur s'affiche sous le résultat, éligible ou non, sur notre site seulement : ni dans
  l'iframe des partenaires, ni sur les écrans d'édition. Étant anonyme, il n'est pas dédoublonné en base :
  un marqueur dans le navigateur évite de reposer la question, et un champ piège écarte les robots de
  formulaire. Il n'y a pas de limitation de débit.
