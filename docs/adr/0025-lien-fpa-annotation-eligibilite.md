# ADR-0025 : Lien FPA dans les annotations DN — ids par démarche et permalien parcours

**Date** : 2026-08-24
**Statut** : Accepté

## Contexte

La DDT instruit les dossiers dans Démarches Numériques (DN) et a désormais accès à
l'espace agent. Pour lui éviter de chercher le dossier à la main, on prérempli
l'annotation privée « Lien vers le dossier sur le fonds de prévention argile » avec
l'URL du back-office. C'est déjà en place sur diagnostic et devis ; il restait à le
faire sur la démarche d'éligibilité ([PR #272](https://github.com/MTES-MCT/fonds-prevention-argile/pull/272)).

Deux obstacles sont apparus en sondant les schémas DN (`pnpm ds:fetch-schema`).

**1. L'id de l'annotation d'éligibilité diffère entre prod et préprod.**

| Annotation « lien FPA » | Prod                            | Préprod                         |
| ----------------------- | ------------------------------- | ------------------------------- |
| Éligibilité             | `Q2hhbXAtNjY4NzQ1Mg==` (126061) | `Q2hhbXAtNjY4NzQ3NQ==` (146377) |
| Diagnostic              | `Q2hhbXAtNjM1MjA4OQ==`          | identique                       |
| Devis                   | `Q2hhbXAtNjM1MjA4OQ==`          | identique                       |

DN conserve les ids de champ au clonage d'une démarche — d'où `Q2hhbXAtNjM1MjA4OQ==`
partagé par quatre démarches distinctes, et d'où le fait que `DS_FIELD_IDS` s'en sorte
depuis toujours avec une constante unique par champ. Les annotations d'éligibilité, elles,
ont été **ajoutées à la main après le clonage** : numérotation indépendante par démarche.
Une constante unique est donc structurellement impossible, et DN **ignore silencieusement**
un `champ_` inconnu — le préremplissage échouerait sans aucune trace.

Vérification faite : les champs **publics** d'éligibilité sont identiques entre prod
(126061) et préprod (146377). La divergence est circonscrite aux annotations postérieures
au clonage, `DS_FIELD_IDS` reste valide pour le reste.

**2. Le lien construit pointait vers un 404.**

Diagnostic et devis écrivent `${BASE_URL}/espace-agent/dossiers/${parcours.id}`, alors que
la route `/espace-agent/dossiers/[id]` résout son segment sur `parcours_amo_validations.id`
(`dossier-detail.service.ts`). Tous les liens FPA déjà présents dans DN tombent donc en 404.
Aggravant : le préremplissage REST **ne sait que créer, jamais mettre à jour** (cf.
[FLOW-AND-SYNC §2.6](../parcours/FLOW-AND-SYNC.md)), donc chaque lien écrit est figé à vie.

## Décision

> Nous résolvons l'id de l'annotation **par numéro de démarche**, et nous traitons le
> **parcours id comme le permalien** de l'espace agent, résolu au clic.

Concrètement :

- `DS_ANNOTATION_LIEN_FPA_ELIGIBILITE` (map numéro de démarche → id de champ) et
  `getAnnotationLienFpaEligibilite()` dans `ds-annotations.ts`, séparé du registre d'ids
  `ds-field-ids.ts`. Sur une démarche non répertoriée : `console.warn` et **aucune clé
  écrite**, plutôt qu'un préremplissage avalé sans bruit par DN.
- La page `/espace-agent/dossiers/[id]`, quand le segment n'est pas une validation
  consultable, tente `resolveEspaceAgentPath(id)` et redirige vers la cible réelle
  (dossier, demande ou prospect). Les trois services de préremplissage continuent
  d'écrire le **parcours id**, seul identifiant stable et toujours présent.

## Options envisagées

### Option A — Ids par numéro de démarche + permalien résolu au clic (retenue)

- Avantages : aucune variable d'environnement ajoutée (le numéro de démarche vient déjà
  de la config) ; **répare rétroactivement** les liens diagnostic/devis déjà figés dans DN ;
  un lien reste valide même si l'état du dossier change après son écriture ; réutilise
  `resolveAdminUrl`, déjà source de vérité pour la synchro Brevo.
- Inconvénients : la map doit être tenue à jour à chaque nouvelle démarche ; un id de
  parcours inconnu produit une redirection puis un 404 au lieu d'un 404 direct.

### Option B — Écrire le `validationId` dans le lien

- Avantages : URL directe, aucune résolution.
- Inconvénients : ne répare rien de l'existant ; une validation n'existe pas toujours
  (prospect créé par un aller-vers avant qualification) ; le lien étant figé, il pointerait
  vers la mauvaise page si le dossier change de nature ensuite.

### Option C — Résolution dynamique de l'id d'annotation par libellé

Interroger `annotationDescriptors` de la démarche et retrouver le champ par son libellé,
sur le modèle de `pieces-justificatives.service.ts` (avec `unstable_cache`).

- Avantages : plus aucun id en dur, robuste à toute nouvelle démarche.
- Inconvénients : dépendance à un libellé exact, qui est modifiable côté DN sans préavis ;
  un appel DN de plus sur le chemin de création ; complexité disproportionnée pour deux
  démarches connues. **Reste la cible** si un troisième environnement ou une nouvelle
  annotation par démarche apparaît.

### Option D — Variable d'environnement par annotation

- Avantages : aucun id dans le code.
- Inconvénients : une variable de plus à poser sur chaque app Scalingo, et un oubli
  redonne exactement le bug silencieux qu'on cherche à éviter.

## Conséquences

### Positives

- La DDT accède au suivi FPA (actions, commentaires, simulation) depuis le dossier DN,
  sur les trois démarches.
- Les liens FPA déjà écrits dans DN sur diagnostic et devis cessent de renvoyer un 404,
  sans rien réécrire côté DN (ce qui est de toute façon impossible par API).
- Une démarche non répertoriée est signalée dans les logs au lieu d'échouer en silence.

### Négatives / Risques

- Toute nouvelle démarche d'éligibilité (nouvel arrêté, nouvel environnement) impose
  d'ajouter son id à la map, sinon l'annotation n'est plus préremplie. Le `console.warn`
  est le garde-fou.
- La résolution du permalien révèle à un agent authentifié qu'un uuid correspond à un
  parcours (redirection vs 404). L'autorisation reste entièrement portée par la page cible :
  aucune donnée de dossier ne transite par la résolution.

### Migration

Aucune migration de données. Les dossiers d'éligibilité **déjà créés** dans DN ne
reçoivent pas l'annotation rétroactivement (le préremplissage ne sait que créer) — seuls
les nouveaux dossiers sont concernés. Les liens diagnostic/devis existants, eux, sont
réparés dès le déploiement puisque la résolution est faite au clic.

## Liens

- PR d'origine : [#272](https://github.com/MTES-MCT/fonds-prevention-argile/pull/272) (id d'annotation erroné, remplacée)
- `src/features/parcours/dossiers-ds/domain/value-objects/ds-annotations.ts`
- `src/features/parcours/core/services/eligibilite.service.ts`
- `src/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service.ts`
- `src/app/(backoffice)/espace-agent/dossiers/[id]/page.tsx`
- [ADR-0011](0011-instance-unique-ds-et-permissions-token.md) — instance unique DS et permissions du token
- [FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md) §2.6 — préremplissage = création seulement
