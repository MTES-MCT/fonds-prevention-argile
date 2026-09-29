# ADR-0040 : Un tunnel sans navigation pour le simulateur, et l'adresse en deux écrans

**Date** : 2026-09-24
**Statut** : Accepté

## Contexte

Les enregistrements de session du simulateur d'éligibilité montrent de nombreux abandons,
surtout à l'étape adresse. Deux causes reviennent :

- **Le bruit autour du formulaire.** Le header du site propose ProConnect, la connexion
  particulier et « Vérifier mon éligibilité » en plein parcours. Un titre générique et une
  bannière d'information repoussent la question sous la ligne de flottaison.
- **L'étape adresse est trop longue.** La recherche d'adresse, la carte, puis l'année de
  construction et le nombre de niveaux s'empilent. Sur mobile et dans l'iframe partenaire,
  « Suivant » sort de l'écran et il faut défiler sous la carte pour le trouver.

La maquette de refonte garde la numérotation « 2/9 » sur les deux écrans de l'adresse et ne
crée pas d'étape « département ».

## Décision

> Le simulateur public vit dans un groupe de routes `(tunnel)` sans navigation. L'étape
> adresse devient deux écrans qui partagent le numéro 2. Les valeurs BDNB transitent hors des
> réponses jusqu'à leur vérification.

1. **Layout tunnel.** `src/app/(tunnel)/layout.tsx` monte `HeaderTunnel` (marque et
   « Besoin d'aide ? » seulement). Le footer reste celui du site : sous le formulaire, il ne
   gêne pas le parcours, et il porte le maillage SEO des départements. La bannière Notice de
   `/simulateur` est retirée.
2. **Deux écrans pour l'adresse.** `SimulateurStep.CARACTERISTIQUES` suit `ADRESSE` dans
   `ETAPES_SAISIE`. `ECRANS_RATTACHES` lui fait afficher le numéro de l'adresse :
   `TOTAL_ETAPES` reste 9. Les contrôles d'année et de niveaux échouent désormais à
   `CARACTERISTIQUES`, et `STEP_SPECIFIC_KEYS` efface ces deux champs en quittant cet écran.
3. **Préremplissage hors des réponses.** La carte pose `prefillBatiment` dans le store
   (persisté avec la simulation), que l'écran des caractéristiques propose à la vérification.
   Soumettre ces valeurs avec l'adresse aurait armé l'arrêt anticipé sur des données que
   l'usager n'a pas encore vues. Quand l'usager ou l'agent choisit un autre bâtiment, l'année
   et les niveaux déjà répondus sont vidés.
4. **Funnel.** Nouvel évènement `simulateur_step_caracteristiques`. `simulateur_step_adresse`
   garde son sens (arrivée sur l'adresse), donc les « simulations commencées » par
   département ne bougent pas.
5. **En-tête des étapes et boutons.** `SimulateurLayout` ne rend plus le titre générique
   du simulateur : un compteur « Simulation d'éligibilité - x/9 », puis la question en titre.
   « Précédent » et « Suivant » restent à leur place, en bas, mais forment une barre `sticky`
   (`BarreCollanteContext`), côte à côte même sur mobile. Le mode embarqué (wizard
   Aller-vers) et le wizard de création de dossier, hors de ce contexte, sont inchangés.
   Les écrans de résultat ne changent pas : leurs contenus complémentaires ne sont pas prêts.

## Options envisagées

### Option A — Étape à part entière, numéro partagé, préremplissage dans le store (retenue)

- Avantages : l'écran survit au rechargement et à « Précédent » (historique du store). Il a
  son propre évènement Matomo, qui distingue l'abandon sur la carte de l'abandon à la
  vérification. L'arrêt anticipé ne juge que des valeurs vérifiées.
- Inconvénients : un champ de plus dans le store, et une table de rattachement pour la
  numérotation.

### Option B — Sous-écran interne à `StepAdresse`

- Avantages : aucun changement du domaine ni du funnel.
- Inconvénients : l'état local se perd au rechargement ou au retour arrière navigateur, et
  aucun évènement ne sépare les deux écrans.

### Option C — Soumettre l'année et les niveaux BDNB avec l'adresse

- Avantages : pas de champ de préremplissage.
- Inconvénients : l'arrêt anticipé, armé dès l'adresse (ADR-0034), coupait sur une année
  BDNB fausse avant que l'usager ne puisse la corriger.

### Option D — Dix étapes numérotées

- Avantages : numérotation mécanique.
- Inconvénients : contredit la maquette (« 2/9 » sur les deux écrans) et allonge
  visuellement un parcours qu'on cherche à alléger.

### Option E — `usePathname` dans `Header` plutôt qu'un groupe de routes

- Avantages : pas de déplacement de fichiers.
- Inconvénients : la logique du tunnel se diffuse dans le header de tout le site, composant
  client partagé par toutes les pages.

## Conséquences

### Positives

- « Suivant » reste visible sans défiler, sur mobile comme dans l'iframe (pourvu que
  l'iframe ait une hauteur fixe).
- Le funnel mesure séparément la carte et la vérification des caractéristiques.

### Négatives / Risques

- **La série du funnel est interrompue.** Le passage adresse → état de la maison n'est pas
  comparable avant et après le déploiement. Il faut ajouter l'étape à la main dans le funnel,
  dans l'interface Matomo.
- Dans le wizard Aller-vers, l'arrêt anticipé reste reporté à `ADRESSE` : un dossier non
  éligible dès l'étape 1 sort après la carte, **sans** année ni niveaux. C'est suffisant pour
  le rattachement territorial, qui ne dépend que de l'adresse.
- Le header du tunnel évite `fr-header__tools-links` (le JS DSFR le recopie dans un menu
  mobile absent et plante au démarrage) et place l'aide mobile dans un bouton, un lien de la
  marque héritant du `::before` de `fr-enlarge-link`.
- Déplacer « Précédent » au-dessus de la carte (maquette) a été écarté pour l'instant :
  la barre côte à côte suffit à garder « Suivant » visible, sans changer une habitude.

## Liens

- `src/app/(tunnel)/layout.tsx`, `src/shared/components/Header/HeaderTunnel.tsx`
- `src/features/simulateur/domain/value-objects/simulateur-step.enum.ts` (`ETAPES_SAISIE`, `ECRANS_RATTACHES`)
- `src/features/simulateur/stores/simulateur.store.ts` (`prefillBatiment`)
- `src/features/simulateur/components/steps/StepAdresse/StepAdresse.tsx`, `src/features/simulateur/components/steps/StepCaracteristiques.tsx`
- `src/features/simulateur/components/shared/SimulateurLayout.tsx`, `src/features/simulateur/components/shared/NavigationButtons.tsx`
- ADR-0033 (Matomo), ADR-0034 (arrêt anticipé reporté à l'adresse)
