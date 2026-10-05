# ADR-0043 : Contrôler l'avis d'imposition lu par DN et écrire le verdict dans une annotation privée

**Date** : 2026-09-29
**Statut** : Accepté

## Contexte

Le formulaire d'éligibilité demande au ménage son revenu fiscal de référence (RFR) et le nombre
de personnes qui le composent, puis ses avis d'imposition (« Dernier avis d'imposition » et le
bloc répété « Tous les Avis d'imposition du foyer »). La DDT vérifie aujourd'hui à la main que
les deux concordent.

Pour une pièce de nature « avis d'impôt », DN lance une analyse au téléversement et expose le
résultat par l'API GraphQL, vérifié dans le code source de DN (`app/services/ocr_service.rb`) et
en préprod :

- l'analyse ne fait pas d'OCR : elle **décode le 2D-Doc** de l'avis, le code-barres signé par la
  DGFiP, et ne garde qu'un code valide de type « avis d'impôt ». Un scan dégradé, une photo ou un
  faux document ne donnent **rien**, sans erreur ;
- `PieceJustificativeChamp.nature = "AVIS_IMPOT"` et `columns` exposent : déclarants 1 et 2,
  référence de l'avis, année des revenus, **nombre de parts**, RFR, date de mise en recouvrement,
  adresse. **Pas de nombre de personnes** : le 2D-Doc n'en porte pas ;
- aucun statut d'analyse n'est exposé : « pas encore analysé » et « échec » sont indiscernables.

Écrire le résultat dans DN impose un second canal. Le préremplissage REST, seul utilisé jusqu'ici
(annotation « lien FPA », ADR-0025), ne sait que **créer** un dossier : au moment où il s'exécute,
aucun avis n'a encore été déposé.

## Décision

> Nous relisons les données extraites par DN, contrôlons leur cohérence avec les déclaratifs, et
> écrivons un verdict daté dans une annotation privée par la mutation GraphQL
> `dossierModifierAnnotations`, pendant le CRON de synchronisation.

- **Critères** : RFR en égalité stricte (somme des avis, dédoublonnés par référence) avec l'effet
  d'un écart sur la tranche de revenus ; nombre de personnes comparé à une **fourchette estimée**
  depuis les parts, jamais au-delà de « à vérifier » ; année des revenus N-1, N étant l'année du
  dépôt. Verdict global : Cohérent, À vérifier ou Non vérifiable.
- **Écriture** : l'annotation (texte long) ne porte qu'**une phrase validée par le métier**, choisie
  par le seul critère du RFR : cohérent, incohérence (« Attention, il semble y avoir une
  incohérence… »), ou vérification impossible. Ni montant ni date : le détail chiffré reste aux
  scripts d'inspection. Réécrite seulement si la phrase change. La mutation exige un
  `instructeurId` : c'est `DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID`, obligatoire, avec un token en
  lecture et écriture.
- **Déclenchement** : dossier d'éligibilité déposé et sans décision, jamais contrôlé ou dont les
  champs ont été modifiés depuis (`dateDerniereModificationChamps`, que la synchronisation lit
  déjà). Activation par démarche : sans id d'annotation dans
  `DS_ANNOTATION_CONTROLE_AVIS_IMPOT_ELIGIBILITE`, rien ne se passe.
- **Données** : aucune valeur fiscale stockée ni journalisée. La base ne garde que le statut et
  deux dates (`dossiers_demarches_simplifiees.avis_impot_*`).

## Options envisagées

### Option A — Annotation DN écrite par mutation, pendant le CRON (retenue)

- Avantages : le verdict est là où la DDT instruit, sans nouvel écran ; le CRON observe déjà
  chaque dossier déposé, le contrôle ne coûte une requête que si les champs ont changé.
- Inconvénients : dépend d'un token en écriture et d'un instructeur présent dans tous les groupes
  de la démarche ; l'historique DN attribue chaque écriture à cet instructeur.

### Option B — Verdict affiché seulement dans l'espace agent FPA

- Avantages : aucune écriture côté DN, aucun instructeur à configurer.
- Inconvénients : la DDT, qui instruit dans DN, ne le voit pas ; il faudrait stocker des données
  fiscales chez nous pour les afficher.

### Option C — Contrôle déclenché par un webhook DN

- Avantages : réaction immédiate au dépôt ou à une modification.
- Inconvénients : aucun webhook DN n'est branché aujourd'hui (seul Brevo l'est) ; un point
  d'entrée public de plus à sécuriser, pour un gain de quelques heures sur un contrôle qui ne
  décide de rien.

### Option D — Instructeur choisi à l'exécution parmi ceux du dossier

- Avantages : aucune variable à configurer.
- Inconvénients : DN attribuerait l'écriture à une personne qui n'a rien fait, et l'API ne dit
  pas à quel compte appartient le token. Écartée.

## Conséquences

### Positives

- La DDT voit dans DN, pour chaque dossier déposé, si le RFR et le foyer concordent avec les avis,
  et ce qu'un écart change à la tranche.
- Un échec (token repassé en lecture, instructeur retiré d'un groupe) apparaît dans
  `/administration/synchronisations` et se retente au passage suivant.
- Le déploiement en prod est inerte tant que l'id de l'annotation de la démarche n'est pas ajouté.

### Négatives / Risques

- **Nouvelle écriture côté DN** : ADR-0025 tenait toute réécriture pour impossible par API. C'est
  vrai des champs du demandeur, pas des annotations privées.
- **Instructeur nommé** : s'il perd l'accès à un groupe, les écritures y échouent. Choisir un
  compte durable (chef de produit ou compte technique), présent dans tous les groupes, vérifié
  avec `pnpm ds:lister-instructeurs <numero>`.
- **Estimation du foyer indicative** : invalidité, garde alternée ou situation familiale modifient
  les parts ; la demi-part de parent isolé est couverte par la fourchette, pas le reste.
- **Règle N-1** : de janvier à l'été, seul l'avis N-2 existe ; ces dossiers ressortent « à
  vérifier » sur l'année.
- **Avis non lu au dépôt** : il n'est pas recontrôlé tant que le demandeur ne modifie rien.
  L'analyse DN ayant lieu au téléversement, le risque de passer pendant l'analyse est négligeable.
- **Écrire fait bouger `dateDerniereModification`** du dossier, pas `dateDerniereModificationChamps`
  (vérifié en préprod) : déclencher sur la première relancerait le contrôle à chaque passage.

### Migration

1. Créer l'annotation « Contrôle avis d'imposition » (texte long, 500 caractères) sur la démarche,
   relever son id (`pnpm ds:fetch-schema <numero>`), l'ajouter à
   `DS_ANNOTATION_CONTROLE_AVIS_IMPOT_ELIGIBILITE`.
2. Sur Scalingo : token en lecture et écriture, et `DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID`
   **avant** le déploiement (variable obligatoire).
3. Mesurer les dossiers ouverts avec `pnpm ds:controler-avis-impot --tous` (dry-run) : le premier
   CRON les annote tous.

## Amendement — Type de ménage et taux de subvention (octobre 2026)

Le même passage écrit deux annotations de plus, demandées par la DDT : « Type de ménage » (liste
déroulante TMO, MO, INT, Hors plafond, Non calculable) et « Taux de subvention » (texte court, taux
des phases étude et travaux : 90, 85 ou 70 %).

- **Calcul sur le RFR déclaré** et le nombre de personnes du formulaire, avec le barème du
  simulateur : la tranche affichée à la DDT est celle annoncée au demandeur. Retenir le RFR de
  l'avis aurait fait dépendre la tranche d'une lecture de 2D-Doc qui échoue souvent ; l'écart est
  de toute façon signalé par l'annotation du contrôle.
- **Île-de-France lue sur le département de la commune DN**, pour ces annotations comme pour
  l'écart du contrôle : la région de la simulation FPA n'est plus lue.
- **Activation par annotation** et non plus par démarche : chacune part dès que son id est
  répertorié, dans la même mutation que les autres.

Conséquence : les seuils ANAH restent codés en dur, et leur mise à jour annuelle change désormais
aussi ce qui est écrit dans DN.

## Amendement — Montants, bloc répété et taux en nombre (octobre 2026)

- **L'incohérence est chiffrée** : la phrase d'alerte se termine par « montant déclaré = X € et
  montant indiqué dans l'avis d'imposition = Y € » (« dans les avis d'imposition (somme de N avis) »
  quand il y en a plusieurs). Demandé par la DDT, qui sinon rouvrait les pièces pour savoir de
  combien. Le RFR seul y figure, et seulement en cas d'écart : les deux autres phrases restent
  sans chiffre, et la base ne stocke toujours aucune valeur fiscale.
- **La somme ne lit plus que le bloc répété** « Tous les Avis d'imposition du foyer », un avis
  par ligne. « Dernier avis » ne sert qu'en repli, quand le bloc est vide (dossiers déposés avant
  lui). Le champ invitait à y mettre plusieurs avis, alors que DN ne décode qu'un 2D-Doc par
  champ ; et une seule pièce illisible y rendait tout le contrôle non vérifiable, même avec un
  bloc complet et lisible.
- **« Taux de subvention » est devenu un nombre entier** côté DN (90, 85, 70, et 0 hors plafond).
  Le texte « 90 % » faisait refuser **toute** la mutation, les trois annotations partant
  ensemble. L'API ne sait pas vider un nombre (`AnnotationValueInput` est `@oneOf`, `null`
  refusé, vérifié en préprod) : un taux devenu incalculable reste en place, la tranche affichant
  « Non calculable ».
- « Type de ménage » s'appelle désormais **« Tranche de revenus »** dans DN (même id, mêmes
  options).

## Liens

- Code : `src/features/parcours/dossiers-ds/domain/avis-impot/`,
  `mappers/avis-impot.mapper.ts`, `services/controle-avis-impot.service.ts`,
  `services/parcours-sync-batch.service.ts`, `domain/value-objects/ds-annotations.ts`
- Scripts : `pnpm ds:inspecter-avis-impot`, `pnpm ds:controler-avis-impot`,
  `pnpm ds:lister-instructeurs`
- Documentation : [FLOW-AND-SYNC § 2.6.3](../parcours/FLOW-AND-SYNC.md), ADR-0011 (instance DN
  unique), ADR-0025 (annotation « lien FPA »)
- DN : `app/services/ocr_service.rb`, `app/graphql/mutations/dossier_modifier_annotations.rb`
