# ADR-0039 : Classer les pièces justificatives d'après leur libellé DN

**Date** : 2026-09-23
**Statut** : Accepté

## Contexte

Les pièces justificatives sont tirées dynamiquement des démarches DN depuis juillet 2026
(FLOW-AND-SYNC §7.5). La maquette les regroupe en quatre groupes — demandeur (ou son
mandataire), assurance, AMO et expert, autres — et signale par un badge les pièces qui ne
sont obligatoires que sous condition (« Sauf si AMO mandataire financier », « Obligatoire
uniquement si indivision »).

Ni l'un ni l'autre n'est disponible dans DN, vérifié par introspection du schéma GraphQL :

- `PieceJustificativeChampDescriptor` n'expose que `id`, `label`, `description`, `required`
  et `fileTemplate`. **Aucune condition, aucune catégorie.** La logique conditionnelle existe
  dans le formulaire, pas dans l'API.
- Les `HeaderSectionChampDescriptor` découpent le formulaire **par rubrique**, pas par
  fournisseur : dans la démarche d'éligibilité, « 4. Devis et RIB » mêle pièces de l'AMO et
  RIB du demandeur, « 5. Description de la maison » mêle pièces du demandeur et de l'assureur.
- `required` signifie « obligatoire **quand le champ est affiché** ». Les deux RIB,
  mutuellement exclusifs, sont tous deux `required: true` ; la pièce d'identité du
  représentant légal est `required: false` alors qu'elle est due dans son cas. L'ancien badge
  « Obligatoire », calqué sur `required`, était faux pour au moins 6 des 14 pièces.

## Décision

> Nous classons chaque pièce par une table de règles ordonnées sur son libellé DN normalisé,
> qui porte sa catégorie et sa condition d'obligation — et rien d'autre.

- **DN reste la seule source de texte.** La table (`pieces-regles.ts`) ne décrit pas la pièce :
  la description affichée est celle de DN, retours à la ligne compris. L'aide éditoriale
  (« où l'obtenir », `pieces-aide.map.ts`) a été retirée en recette.
- **Une condition n'est posée que si elle distingue des demandeurs éligibles.** L'attestation
  d'assurance n'en a pas, le simulateur rendant inéligible une maison non assurée ; le devis
  de phase étude non plus, puisqu'il couvre l'accompagnement et le diagnostic.
- Première règle qui matche ; les plus spécifiques d'abord (« autres financeurs » contient
  « assureurs », « expert en RGA » cite aussi « diagnostic de vulnérabilité »). Les mots-clés
  visent ce qui **distingue** la pièce, jamais sa formule d'ouverture : neuf libellés sur
  quatorze commencent par « Attestation sur l'honneur », et DN écrit « Attestion ».
- Un libellé inconnu tombe dans **« Autres pièces »**, affichée : la liste reste exhaustive.
  Mal classer est cosmétique, perdre une pièce ne l'est pas. Même règle au regroupement : une
  catégorie disparue, venue d'une entrée de cache antérieure, est rangée dans « Autres pièces ».
- La condition **remplace** le rendu de `required`. Une pièce sans condition mais non
  obligatoire est marquée « Facultatif » ; les autres relèvent de « Sauf mention contraire,
  toutes les pièces sont obligatoires ».
- La liste de repli (`PIECES_FALLBACK`) porte des catégories explicites : ses libellés ne
  sont pas ceux de DN, la table ne les reconnaîtrait pas.

## Options envisagées

### Option A — Règles sur le libellé (retenue)

- Avantages : couvre les groupes voulus par la maquette ; une pièce ajoutée dans DN
  dont le libellé contient un mot connu est classée sans déploiement ; libellés réels
  verrouillés par test.
- Inconvénients : une pièce **renommée** dans DN sort de sa règle sans bruit (elle reste
  visible, dans « Autres pièces ») ; la table se maintient à la main.

### Option B — Sections DN (`HeaderSectionChampDescriptor`)

- Avantages : aucune maintenance côté code, le classement suit le formulaire.
- Inconvénients : autre axe que la maquette, sections mixtes, libellés numérotés
  (« 5. Description de la maison ») ; ne donne pas les conditions.

### Option C — Table par identifiant de champ

- Avantages : classement exact, insensible aux renommages.
- Inconvénients : un champ ajouté après le clonage de la démarche a un id propre à chaque
  environnement (cf. ADR-0025) — il faudrait une table par démarche, et toute nouvelle pièce
  tomberait dans « Autres » jusqu'à la mise à jour.

### Écartés en cours de route

- **Libellés éditoriaux courts** (« RIB du propriétaire » au lieu du libellé DN) : une
  seconde source qui diverge sans bruit quand DN renomme la pièce.
- **Aide éditoriale** (« Téléchargeable sur impots.gouv.fr », « À demander à votre
  assureur ») : même motif, et elle s'affichait jusque sur les pièces de la phase travaux. Un
  texte utile a sa place dans la description DN, où l'équipe qui tient le formulaire le voit.
- **Masquer une pièce jugée non applicable** d'après nos données (mandataire financier,
  accompagnement) : le demandeur peut répondre autre chose dans le formulaire DN, et une
  pièce non annoncée coûte un aller-retour avec la DDT.

## Conséquences

### Positives

- Le rendu de la maquette (accordéons par catégorie, badges d'exception) est obtenu sur les
  quatre surfaces qui partagent `PiecesJustificatives`.
- Les badges d'obligation disent vrai, là où `required` induisait en erreur.

### Négatives / Risques

- Dérive silencieuse sur renommage DN. Parade : `pnpm ds:fetch-pieces` affiche la catégorie
  et la condition résolues, et liste les pièces tombées dans « Autres pièces » — à relancer à
  chaque évolution d'un formulaire DN.
- Les trois catégories de la maquette ne couvrent pas l'étape devis : attestation et devis du
  maître d'œuvre, devis des travaux vont dans « Autres pièces ». À revoir avec le design.
- Les conditions sont génériques (« Sauf si AMO mandataire financier »), identiques pour tous
  les dossiers.

### Migration

- Clé de cache `ds-pieces` passée de `v2` à `v4` : une entrée antérieure n'a pas de catégorie
  (`v2`) ou porte la catégorie `ASSUREUR`, renommée `ASSURANCE` en recette (`v3`).
- Suite prévue : reformuler les conditions pour le dossier affiché (on connaît
  l'accompagnement et `est_mandataire_financier`) par une fonction pure appliquée **hors** du
  cache, pour ne pas mettre de contexte de parcours dans la clé.

## Liens

- `src/features/parcours/dossiers-ds/domain/pieces-justificatives/pieces-regles.ts`
- `src/features/parcours/dossiers-ds/domain/pieces-justificatives/pieces-categories.ts`
- `src/features/parcours/dossiers-ds/components/PiecesJustificatives.tsx`
- `scripts/ops/ds/fetch-pieces-justificatives.ts` (`pnpm ds:fetch-pieces`)
- Documentation : [FLOW-AND-SYNC §7.5](../parcours/FLOW-AND-SYNC.md)
