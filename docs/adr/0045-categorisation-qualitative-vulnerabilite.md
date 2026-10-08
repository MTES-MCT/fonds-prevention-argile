# ADR-0045 : Catégorisation qualitative des réponses de vulnérabilité, sans score

**Date** : 2026-10-02
**Statut** : Accepté

## Contexte

Le simulateur de vulnérabilité RGA (`/vulnerabilite-rga`) restituait un score sur 100, moyenne
quadratique d'un barème par réponse ([ADR-0041](0041-calcul-vulnerabilite-sans-ponderation-cascade.md)).
Ces barèmes étaient des valeurs de départ, jamais validées scientifiquement. Un nombre donne
pourtant une impression de mesure : « 62/100 » se lit comme un diagnostic, ce que le simulateur
n'est pas, et aucun expert ne pouvait dire pourquoi une gouttière défaillante valait 100 et une
haie moyennement dense 55.

Le métier sait en revanche classer chaque réponse : point critique, point de vigilance, point à
vérifier, bonne pratique.

## Décision

> Chaque réponse porte une catégorie qualitative, fournie par le métier. Le résultat est un
> décompte de points par catégorie, jamais un score.

Cinq catégories (`grille-categorisation.ts`, champ `categorie` de chaque réponse) : `critique`,
`vigilance`, `a_verifier`, `bonne_pratique`, et `sans_objet` qui n'est ni affichée ni comptée.

- **La grille reste le seul fichier de méthode.** Labels, couleurs et validation du payload en
  dérivent ; aucun composant ne décide d'une catégorie.
- **L'aléa RGA sort de la grille.** C'est une donnée de contexte issue de la carte, citée dans la
  synthèse du résultat. Il ne produit aucun point.
- **L'essence de l'arbre est posée mais sans catégorie** (`sansCategorie`), en attente des études
  par essence. C'est « arbre proche = oui » qui porte le point critique, et la fiche conseil de
  l'arbre est rattachée à cette question.
- **Le résultat** : une mise en avant DSFR (`fr-callout`) dont l'accent suit le point le plus
  grave, puis les fiches existantes regroupées en trois sections — critiques, vigilance, à
  vérifier. Un point sans fiche est listé sans conseil plutôt que passé sous silence.
- **Les catégories ne sont pas stockées.** `vulnerabilite_simulations` ne garde que les réponses ;
  stats et espace agent relisent la grille en vigueur.
- **Le renvoi vers le simulateur d'éligibilité est conditionnel** : département éligible, aléa
  fort, maison non mitoyenne. Ces règles sont importées de `features/simulateur`, pas recodées.

## Options envisagées

### Option A — Catégorie par réponse, décompte de points (retenue)

- Avantages : chaque classement est défendable isolément par le métier ; le résultat dit quoi
  regarder sans prétendre mesurer ; une grille révisée requalifie aussi l'historique.
- Inconvénients : plus de valeur unique à suivre dans le temps ; deux logements très différents
  peuvent afficher le même décompte.

### Option B — Garder le score en attendant sa validation

- Avantages : aucun changement, indicateur synthétique conservé.
- Inconvénients : publie une mesure que personne ne peut justifier ; la validation scientifique
  d'une pondération n'a pas d'échéance.

### Option C — Score calculé à partir des catégories (critique = 3, vigilance = 2…)

- Avantages : garde une jauge.
- Inconvénients : réintroduit une pondération arbitraire sous un autre nom.

## Conséquences

### Positives

- Le simulateur ne publie plus de chiffre non validé.
- Les stats mesurent des faits lisibles : nombre moyen de points critiques par simulation.
- Suppression du calcul de score, de la jauge, des seuils de niveau et du tri des fiches par score.

### Négatives / Risques

- `features/vulnerabilite-rga` importe désormais les règles d'éligibilité de `features/simulateur`,
  ce qu'[ADR-0030](0030-simulateur-vulnerabilite-rga.md) excluait. Dépendance limitée à trois
  fonctions pures (`domain/rules/eligibility`), préférée à une duplication des critères.
- Six réponses classées à traiter n'ont pas de fiche conseil (liste figée par
  `recommandations.service.test.ts`) : contenu à fournir par le métier.
- Les séries de l'onglet `/administration/vulnerabilite` ne sont pas comparables avant et après.

### Migration

- `0055_vulnerabilite_supprime_scores` supprime `score_global` et `score_par_categorie` — sans
  reprise, la feature n'étant pas en production.
- `0056_vulnerabilite_source_chaleur_sous_sol` ajoute la colonne de la nouvelle question.
- La clé de `sessionStorage` passe en `-v2` : un résultat persisté sous l'ancien format n'est pas relu.
- Le funnel Matomo gagne une étape (`vulnerabilite_step_source_chaleur_sous_sol`), à ajouter côté Matomo.

## Amendement (2026-10-08) : l'essence de l'arbre porte la catégorie

L'essence était posée sur un écran à part, sans catégorie, en attente d'études. Elle rejoint
l'écran de proximité (sous-question affichée sur « Oui ») et porte désormais le point de l'arbre :
« arbre proche = oui » passe en `sans_objet`, et `sansCategorie` disparaît de la grille.

Les dix essences deviennent quatre groupes, pour un remplissage plus simple :

- **Grand arbre très gourmand en eau** (chêne, peuplier, saule, frêne, cèdre, cyprès) : critique.
  Chêne, peuplier et frêne ont les pires scores de sécurité de Cutler et Richardson (1989) ; le
  saule y est moyen mais porte jusqu'à 40 m, et le guide RGA du ministère le cite avec le cèdre.
- **Grand arbre d'ornement ou conifère** (érable, platane, tilleul, marronnier, robinier, hêtre,
  orme, pin, sapin, épicéa, if) : critique. Grands sujets qui portent à 15-20 m, même avec un
  score correct ; NHBC 4.2 classe ces conifères en demande en eau modérée.
- **Arbre fruitier ou petit arbre** (pommier, poirier, prunier, cerisier, sorbier, bouleau,
  aubépine) : vigilance. Portée de 6 à 15 m.
- **Autre essence ou je ne sais pas** : critique, hypothèse prudente.

Le score de sécurité de l'étude se lit (2) ÷ (1) × 10 : plus il est haut, plus l'essence est
sûre. La définition de « proche » reste « moins de 1,5 fois la hauteur adulte », sans
distinction par groupe. Les valeurs déjà enregistrées (`peuplier`, `chene`…) ne sont pas
reprises, la feature n'étant pas en production. La clé de `sessionStorage` passe en `-v3`, et
l'évènement Matomo `vulnerabilite_step_arbre_essence` disparaît du funnel.

## Liens

- Remplace : [ADR-0041](0041-calcul-vulnerabilite-sans-ponderation-cascade.md)
- Amende : [ADR-0030](0030-simulateur-vulnerabilite-rga.md) (grille, jauge, indépendance vis-à-vis de `simulateur`)
- Grille : `src/features/vulnerabilite-rga/domain/value-objects/grille-categorisation.ts`
- Catégorisation : `src/features/vulnerabilite-rga/domain/services/categorisation.service.ts`
- Synthèse : `src/features/vulnerabilite-rga/domain/services/synthese-resultat.service.ts`
- Renvoi conditionnel : `src/features/vulnerabilite-rga/domain/services/eligibilite-fonds.service.ts`
- Guide : [SIMULATEUR-VULNERABILITE-RGA.md](../vulnerabilite/SIMULATEUR-VULNERABILITE-RGA.md)

## Amendement (2026-10-08) : une fiche pour chaque réponse à traiter

Les dernières réponses sans fiche en ont une : la pente « plat » et « s'éloigne de la maison »
reprennent la fiche de la pente, le récupérateur « en bon état » celle du récupérateur, et le
gravier « absent » reçoit sa propre fiche, les deux fiches de gravier existantes portant sur un
gravier présent. Le contenu d'une fiche ne dépend pas de la catégorie qui la déclenche.

L'affichage « point sans conseil » disparaît, puisque plus rien ne l'alimente. Le test
`getReponsesSansCarte` attend désormais une liste vide : une réponse à traiter ajoutée sans fiche
le fait échouer, au lieu de s'afficher sans conseil.
