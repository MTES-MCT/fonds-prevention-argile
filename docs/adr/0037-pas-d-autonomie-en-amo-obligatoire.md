# ADR-0037 : Pas d'autonomie là où l'AMO est obligatoire

**Date** : 2026-09-14
**Statut** : Accepté
**Amende** : [ADR-0018](0018-arret-accompagnement-amo.md)

## Contexte

[ADR-0018](0018-arret-accompagnement-amo.md) a ouvert deux chemins vers l'autonomie : le
demandeur annule son accompagnement, ou l'AMO clique « Ne plus accompagner ». Le premier
a été gardé dès l'origine — l'autonomie n'existe pas là où l'arrêté impose une AMO. Le
second, non.

Constaté en production le 2026-09-03 : une AMO du Lot-et-Garonne (département à AMO
obligatoire) avait détaché deux dossiers qu'elle suivait depuis deux mois. Les demandeurs
se sont retrouvés sans accompagnateur dans un département où c'est impossible, et
personne ne pouvait revenir en arrière — le détachement posant `entreprise_amo_id = NULL`,
l'AMO perd l'accès au dossier à la seconde du clic, et `assignAmoAutomatiqueForUser`
refuse hors de l'étape `choix_amo` comme sur un parcours ayant déjà une validation. Ni
l'UI ni `pnpm fix:lier-amo-oblig` ne rattrapaient ces dossiers.

Deux causes, pas une :

1. **Aucune garde territoriale côté AMO.** `arreterAccompagnementAction` vérifiait le rôle,
   le responsable et le gel DDT (§2.7.1), jamais le département.
2. **La garde côté demandeur était trouée.** Elle lisait `rgaSimulationData` seul puis
   testait `if (codeInsee && …)` : sur un dossier créé par un Aller-vers, où la simulation
   ne vit que côté agent, `codeInsee` valait `null` et la garde était **entièrement sautée**.

Le menu « Gérer » aggrave la confusion : « Archiver » et « Ne plus accompagner » y sont
deux entrées voisines aux effets radicalement différents (l'une garde l'AMO rattachée et
reste réversible, l'autre détache définitivement), sans que rien ne le laisse deviner.
Pour une AMO qui veut cesser de suivre un dossier, « Ne plus accompagner » est même le
libellé le plus intuitif des deux.

## Décision

### 1. En AMO obligatoire, l'AMO ne peut pas se détacher

Arbitrage métier : dans ces départements il n'y a qu'une AMO par territoire dans la
majorité des cas — personne ne reprendrait le dossier. La sortie de l'AMO y est
l'**archivage**, qui garde le lien et reste réversible.

En AMO facultative, rien ne change : les deux boutons coexistent et répondent à deux
besoins distincts — « Ne plus accompagner » pour un demandeur qui poursuit seul,
« Archiver » pour garer un dossier (abandon, non-éligibilité, non-réponse).

### 2. Un prédicat unique pour les trois chemins vers l'autonomie

`peutPasserEnAutonomie(parcours)` (`domain/value-objects/departements-amo.ts`), adossé à
`resolveAmoModeForParcours`, qui résout le département **USER-first avec repli agent**
(`getDemandeurFirstLogement`, convention RBAC-ROLES §6) et renvoie `null` quand la commune
est introuvable. Les appelants refusent sur `null` : **jamais de repli permissif**, c'est
précisément ce qui rendait la garde demandeur inopérante.

La garde vit dans la **server action** côté AMO et dans le **service** côté demandeur, pas
dans `detacherAmo` : le script `pnpm fix:detacher-amo` reste l'échappatoire de dernier
recours et doit pouvoir forcer un détachement que l'UI refuse (même principe que le gel
DDT, §2.7.1). Le masquage de l'entrée de menu n'est qu'un confort.

### 3. Les dossiers déjà détachés sont rattachés, pas laissés en l'état

Service `rattacherAmo` (`services/rattachement-amo.service.ts`), exposé par
`pnpm fix:rattacher-amo` (dry-run par défaut, `--apply`, `--parcours-id`). Il ne traite que
les parcours actifs en `sans_amo` sans entreprise **dans un département à attribution
automatique** : ailleurs l'autonomie est le résultat voulu, on n'y touche pas.

L'AMO remise est celle d'origine, retrouvée via l'agent de la dernière action
`accompagnement_arrete` ; à défaut (détachement par l'ancien script ops, qui n'écrit aucun
audit), l'AMO du territoire.

Deux choix à connaître :

- **Statut cible `en_attente`, pas `logement_eligible`.** Le détachement avait purgé
  `validee_at` : on ne sait plus si l'AMO avait validé l'éligibilité. Plutôt que d'inventer
  sa décision, on la lui refait confirmer. Effet de bord assumé : tant qu'elle n'a pas
  répondu, le formulaire d'éligibilité du demandeur est bloqué — état déjà conçu et outillé
  pour la demande d'accompagnement après autonomie (FLOW-AND-SYNC §2.10).
- **Ni email ni token.** L'AMO retrouve le dossier dans son listing. Un mail
  « votre AMO vous est réattribuée » à un demandeur qui n'a jamais su l'avoir perdue crée
  plus de questions qu'il n'en résout ; côté AMO, la reprise de contact se fait hors outil.

`current_step` et `current_status` ne sont **jamais** touchés : un dossier déjà au
diagnostic y reste, il ne fait que retrouver son accompagnateur.

## Conséquences

- Une AMO obligatoire qui ne veut plus suivre un dossier passe par « Archiver ». Le
  dossier reste visible et récupérable, ce qui est un gain par rapport au détachement.
- Le rattachement remet dans le listing de l'AMO des dossiers qu'elle avait délibérément
  quittés. C'est le prix de la réparation, et à signaler aux structures concernées.
- `validee_at` repositionné à la re-validation décale la mesure d'ancienneté de ces
  dossiers : la série n'est pas comparable avant/après pour eux.
- Comme `fix:detacher-amo`, le script n'écrit **pas** d'entrée `parcours_actions` (action
  ops sans agent connecté) : sa sortie fait foi, la conserver.

## Alternatives écartées

- **Supprimer « Ne plus accompagner » partout.** Le besoin est réel en AMO facultative,
  où l'autonomie est un résultat légitime du parcours.
- **Détacher puis réattribuer une autre AMO du territoire.** Suppose de savoir arbitrer
  entre plusieurs AMO sur une commune, et n'a pas de sens là où il n'y en a qu'une.
- **Restaurer `logement_eligible` au rattachement.** Fabriquerait une décision
  professionnelle que rien en base n'atteste.
