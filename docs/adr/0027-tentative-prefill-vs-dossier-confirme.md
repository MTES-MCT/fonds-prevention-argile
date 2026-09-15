# ADR-0027 : Tentative de préremplissage vs dossier confirmé

**Date** : 2026-08-25
**Statut** : Accepté

## Contexte

`dossiers_demarches_simplifiees` représente aujourd'hui **deux objets à la fois** : le dernier
brouillon prérempli fabriqué par l'app, et le dossier administratif du demandeur. Ce ne sont
pas les mêmes choses, et la confusion est la cause commune de tous les incidents de
synchronisation traités depuis juin 2026.

Rappel des contraintes DN, toutes vérifiées (doc officielle du préremplissage, schéma GraphQL,
observation en production) :

- l'API REST de préremplissage crée un **brouillon orphelin**, « invisible pour l'administration
  tant qu'il n'est pas soumis », rattaché à l'usager seulement après authentification ;
- l'énumération `DossierState` ne contient pas `brouillon` : l'API instructeur ne modélise même
  pas l'état qu'on cherche à lire ;
- aucun endpoint ne dit si un `prefill_token` a été réclamé ; aucun webhook de dépôt ;
- DN purge les brouillons trois mois après leur **dernière modification**, information que nous
  ne voyons pas ;
- en revanche, un dossier **déposé** porte l'annotation « lien FPA » contenant le `parcoursId`
  ([ADR-0025](0025-lien-fpa-annotation-eligibilite.md)), et `updatedSince` permet de balayer
  les dossiers modifiés depuis le dernier passage.

Entre le clic et le dépôt, le lien se perd de quatre façons : mauvais compte DN au moment de
réclamer le brouillon, dossier rempli depuis le poste de l'AMO, purge, ou dossier créé
directement sur DN sans passer par notre lien. Dans les trois premiers cas le demandeur est
bloqué ; dans le quatrième l'AMO perd la visibilité alors que rien n'a échoué.

État constaté en août 2026 : **105 parcours sur 116** listés en « sync erreur » sont des
préremplis simplement pas encore déposés, et une **cinquantaine de pointeurs** ont été
supprimés en juin par un reset qui croyait, à tort, ces dossiers disparus
([ADR-0026](0026-gel-reset-eligibilite-not-found.md)).

## Décision

> Nous distinguons la **tentative** (un brouillon prérempli qu'on a fabriqué) du **dossier
> confirmé** (un dossier observé déposé côté DN). Une tentative n'est jamais autoritaire et
> n'est jamais supprimée ; seul le dossier confirmé pilote l'état du parcours.

### Les deux objets

|                                   | Tentative                                                | Dossier confirmé       |
| --------------------------------- | -------------------------------------------------------- | ---------------------- |
| Origine                           | préremplissage FPA, ou numéro découvert par rattachement | dossier observé déposé |
| Cardinalité par (parcours, étape) | plusieurs                                                | au plus un             |
| Observable côté DN                | non, jamais avant dépôt                                  | oui                    |
| Fait foi pour l'état du parcours  | non                                                      | oui                    |
| Suppression                       | **jamais** — le numéro est conservé définitivement       | jamais                 |

### Invariants

- un numéro DN appartient à **un seul** parcours (`ds_number` unique globalement) ;
- **un seul** dossier confirmé par `(parcours, étape)` — contrainte déjà posée en base ;
- plusieurs tentatives par `(parcours, étape)` sont normales et attendues ;
- aucun numéro DN généré ou découvert n'est jamais effacé, quelle que soit la remédiation.

### Rattachement

Le rattachement se fait **au dépôt**, jamais avant : un balayage périodique des dossiers
modifiés (`updatedSince`) lit l'annotation FPA, en extrait le `parcoursId` et rapproche.

| Situation                                                      | Résolution                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| Candidat déposé, annotation valide, aucun dossier confirmé     | rattachement automatique                                        |
| Candidat déjà confirmé sous le même numéro                     | mise à jour idempotente                                         |
| Pointeur courant = tentative jamais observée, candidat déposé  | le candidat gagne ; l'ancienne tentative reste au registre      |
| Plusieurs candidats déposés, ou un autre dossier déjà confirmé | **conflit, arbitrage humain** — jamais « le plus récent gagne » |
| Numéro déjà rattaché à un autre parcours                       | refus, incident journalisé — on ne le « vole » jamais           |
| Annotation modifiée à la main (`prefilledValueModified`)       | rattachement manuel                                             |
| Deux annotations pointant des parcours différents              | rattachement manuel                                             |
| Dossier déposé sans annotation FPA                             | file de traitement manuel — jamais ignoré en silence            |

L'email usager n'est **pas** une clé de rattachement : il peut être celui de l'AMO, être
partagé, ou avoir changé. Il ne sert que d'indice pour un humain.

### Deux règles transverses

**Le `prefill_token` est un secret.** L'URL de préremplissage permet de réclamer le brouillon :
elle n'est pas conservée indéfiniment, n'apparaît jamais dans un payload d'évènement ni dans
un log, et est purgée après dépôt. Le cœur identitaire (le numéro) est append-only ; le secret
ne l'est pas.

**L'interface n'affirme jamais un état qu'on ne peut pas observer.** Avant dépôt, elle propose
une action (« accéder à mon formulaire ») au lieu de décrire une situation (« reprendre mon
dossier »). C'est cette confusion qui a affiché « Reprendre » sur des dossiers inexistants.

### Le super-admin peut rattacher (troisième exception au read-only)

Le rattachement manuel d'un dossier DN est ouvert au **super-administrateur**, au même titre
que les commentaires ([ADR-0024](0024-commentaires-super-admin-espace-agent.md)) et la
ré-ouverture ([ADR-0016](0016-reouverture-demande-refusee.md)). C'est une exception assumée :
la mutation touche la source de vérité d'un dossier, mais sans elle le seul recours est une
intervention SQL en production — ce que cette PR cherche précisément à supprimer. La garde
`assertNotSuperAdminReadOnly` n'est donc **pas** appelée par `rattacherDossierDnAction`.

### Ce que nous renonçons explicitement à faire

- voir un brouillon avant son dépôt, ou savoir s'il a été ouvert, réclamé, ou purgé ;
- distinguer un brouillon vivant d'un brouillon supprimé ;
- empêcher un demandeur de créer plusieurs dossiers pour une même étape ;
- rattacher automatiquement un dossier créé entièrement hors de notre lien (sans annotation).

Ces quatre limites viennent de DN, pas de notre code. Le but n'est pas de les contourner mais
de faire qu'elles n'aient plus de conséquence.

## Options envisagées

### Option A — Registre de tentatives + pointeur confirmé + réconciliation au dépôt (retenue)

- Avantages : aucune information n'est jamais perdue ; la réparation devient automatique et
  couvre le stock existant ; les doublons deviennent détectables ; rend inoffensive la
  régénération d'un lien par le demandeur.
- Inconvénients : une table de plus ; des conflits à arbitrer ; ne répare qu'**après** le dépôt.

### Option B — Conserver le modèle actuel et réparer au cas par cas

- Avantages : aucun développement.
- Inconvénients : chaque cas coûte une intervention en production (deux requêtes SQL par
  dossier, comme en août 2026), ne passe pas à l'échelle, et laisse les demandeurs bloqués
  jusqu'à ce qu'ils se plaignent.

### Option C — Journal d'évènements comme source de vérité (event sourcing)

- Avantages : historique complet et rejouable.
- Inconvénients : surdimensionné pour le besoin ; impose de reconstruire un état à la lecture
  alors qu'un pointeur courant suffit. Un journal reste utile en complément, pas en substitut.

### Option D — Ne jamais mémoriser de lien : chaque clic crée un brouillon

- Avantages : le lien cassé disparaît par construction, beaucoup moins de code.
- Inconvénients : multiplie les brouillons et donc les dépôts en double ; fait perdre la saisie
  déjà effectuée (particulièrement pénible avec des pièces jointes) ; ne dit toujours pas à
  l'usager quel compte DN détient son dossier. Fausse simplicité.

### Option E — Rattacher par l'email usager

- Avantages : disponible sans annotation, y compris sur les dossiers antérieurs à ADR-0025.
- Inconvénients : l'email peut être celui de l'AMO, être partagé ou avoir changé ; il n'est de
  toute façon lisible qu'après dépôt. Conservé comme **indice**, jamais comme clé.

## Conséquences

### Positives

- Un pointeur peut être remplacé sans rien détruire : la régénération d'un lien devient sûre.
- Le stock d'orphelins se répare automatiquement au premier balayage.
- Les dépôts en double, aujourd'hui invisibles, remontent pour arbitrage.
- Le diagnostic cesse de signaler comme cassés les 105 préremplis en attente.

### Négatives / Risques

- Le rattachement automatique **dépend d'une capacité DN non documentée** : le préremplissage
  d'une annotation privée. Vérifié le 2026-08-25 sur les démarches d'éligibilité et de devis
  (DN affiche « Donnée remplie automatiquement »), mais garanti par aucun contrat : DN ignore
  silencieusement un champ inconnu, donc à re-vérifier après toute évolution des démarches.
- Les dossiers créés **avant** le déploiement d'ADR-0025 (prod : 2026-08-25 09:03) n'ont pas
  d'annotation et ne se rattacheront jamais automatiquement. Population figée, à traiter par
  rattachement manuel.
- L'annotation est identifiée par son `champDescriptorId` (`Q2hhbXAtNjY4NzQ1Mg==` en prod pour
  l'éligibilité), pas par son libellé ni par l'id d'instance, qui change d'un dossier à l'autre.
- Les dossiers antérieurs à ADR-0025 n'ont pas d'annotation : ils relèvent du traitement manuel.
- Un conflit non arbitré laisse un parcours en attente d'une décision humaine.

### Migration

Aucune donnée n'est déplacée. Le registre est amorcé par un backfill en deux sources : les
pointeurs actuels (fiables) et les numéros cités dans `sync_run_entries.error` (indices,
marqués comme tels — ils ne restituent ni l'URL de préremplissage ni le `ds_id`). Le premier
balayage de réconciliation doit être **complet**, sans `updatedSince` : sinon les dossiers
déposés anciens et jamais modifiés depuis resteraient invisibles.

Découpage retenu : registre des tentatives (phase 3), réconciliation au dépôt (phase 4),
régénération de lien côté demandeur (phase 5), rattachement manuel et aide au compte DN
(phase 6).

## Amendement (2026-09-15) — la régénération crée le formulaire, elle ne le prépare plus

La phase 5 livrait un secours en **deux clics** : « Créer un nouveau formulaire » retirait le
pointeur, puis invitait le demandeur à relancer le CTA principal. Trois défauts constatés en
recette, tous réparés par un unique aller-retour serveur (`recreerFormulaireDemandeur`) :

- la fenêtre anti-rafale de **10 minutes** refusait le cas nominal — ouvrir le lien, constater
  qu'il ne fonctionne pas, en redemander un — avec un message d'erreur en haut de page ;
- le CTA principal lisait la simulation dans le **store du navigateur**, vide sur un dossier créé
  par un Aller-vers : le demandeur restait alors sans pointeur **et** sans lien ;
- l'onglet DN ne pouvait plus être ouvert au second clic sans sortir du geste utilisateur.

Ce que l'amendement change : une **modale de confirmation** avertit de la perte du brouillon, et
cette confirmation explicite remplace la fenêtre de 10 min (plancher ramené à 30 s, anti
double-clic). La simulation est lue **en base**. Le secours est étendu au **diagnostic** et aux
**devis**, que `STEPS_REINITIALISABLES` couvrait déjà côté service.

Ce que l'amendement ne change pas : les invariants du registre (le numéro courant y est écrit
**avant** le retrait du pointeur, jamais supprimé), le sondage préalable des numéros connus (un
dossier déposé se rattache, il ne se recrée pas), le refus sur un dossier **déjà déposé** et le
refus sur un **sondage DN impossible** — `force` ne relâche que la fenêtre anti-rafale. Détail
en [FLOW-AND-SYNC §7.6](../parcours/FLOW-AND-SYNC.md).

## Liens

- [ADR-0026](0026-gel-reset-eligibilite-not-found.md) — gel du reset destructif, constat fondateur
- [ADR-0025](0025-lien-fpa-annotation-eligibilite.md) — annotation FPA porteuse du `parcoursId`
- [ADR-0013](0013-remediation-dossiers-dn-sync-erreur.md) — remédiation, amendé par 0026
- [ADR-0012](0012-url-reprise-dossier-basee-sur-depot.md) — URL « commencer » vs « reprendre »
- [ADR-0009](0009-semantique-statut-ds-depose-vs-brouillon.md) — sémantique du dépôt
- [FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md) — flux et synchronisation
- [SYNC-ERREURS-ET-REMEDIATION.md](../parcours/SYNC-ERREURS-ET-REMEDIATION.md) — cas et playbook
- Pointeur courant : `src/shared/database/schema/dossiers-demarches-simplifiees.ts`
- Création du prérempli : `src/features/parcours/dossiers-ds/services/dossier-ds.service.ts`
- Sync et verdict DN : `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`
- Choix de l'URL affichée : `src/features/parcours/dossiers-ds/utils/ds-url.utils.ts`
