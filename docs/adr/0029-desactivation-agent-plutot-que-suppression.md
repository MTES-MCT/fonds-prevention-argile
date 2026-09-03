# ADR-0029 : Désactivation d'un agent plutôt que suppression

**Date** : 2026-09-03
**Statut** : Accepté

## Contexte

Un agent quitte ses fonctions : il faut lui couper l'accès au back-office. Le seul outil
disponible était le bouton « Supprimer » de `/administration/agents`. Or l'inventaire des
six clés étrangères vers `agents` montre que la suppression détruit de l'information :

| Table / colonne                                      | `ON DELETE` | Le nom survit-il ?                                                              |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `parcours_actions.agent_id`                          | `set null`  | **oui** — snapshot `author_name` / `author_structure`, avec repli au repository |
| `prospect_qualifications.agent_id`                   | `set null`  | non                                                                             |
| `parcours_prevention.archived_by`                    | `set null`  | non — « archivé par » devient vide                                              |
| `parcours_prevention.created_by_agent_id`            | `set null`  | non — et le renvoi d'invitation refuse un parcours sans créateur                |
| `parcours_prevention.rga_simulation_agent_edited_by` | `set null`  | non — « modifié par » disparaît                                                 |
| `agent_permissions.agent_id`                         | `cascade`   | sans objet (configuration, pas historique)                                      |

Seul `parcours_actions` était protégé, par le snapshot d'auteur dénormalisé. Les quatre
autres traces devenaient anonymes, silencieusement.

Pire, la suppression **échouait** dès que l'agent avait qualifié un prospect :
`prospect_qualifications.agent_id` était déclaré `NOT NULL` **et** `ON DELETE set null`,
deux contraintes contradictoires (erreur Postgres 23502). Le bouton était donc à la fois
destructeur et cassé.

Deux exigences supplémentaires sont venues du terrain : identifier sans ambiguïté un agent
parti dans la liste d'administration, et ne plus l'inclure dans les envois groupés.

## Décision

**On désactive, on ne supprime plus** — sauf pour un agent sans aucune trace.

### 1. Trois colonnes sur `agents` (migration `0047`)

`desactive_at` (timestamp, `null` = actif), `desactive_par` (FK `agents`, `set null`),
`desactive_raison` (texte libre optionnel). Un timestamp plutôt qu'un booléen `actif` :
on veut la date, et ça s'aligne sur `parcours_prevention.archived_at`.

La même migration corrige `prospect_qualifications.agent_id` en `DROP NOT NULL`.

### 2. Une seule garde coupe l'accès

Toutes les gardes back-office (`checkProConnectAccess`, `checkAgentAccess`,
`checkRoleAccess`, `checkBackofficePermission`) passent par `checkUserAccess` →
`getCurrentUser`. La garde y est donc posée une fois :

```ts
if (agent?.desactiveAt) return null;
```

Conséquence voulue : **la session déjà ouverte tombe au rendu suivant**, pas à l'expiration
du JWT. Le layout espace-agent renvoie l'agent sur `/connexion/agent`.

`authenticateFromProConnect` refuse en tête de fonction, avant les deux branches (`sub`,
puis `email` pour une première connexion en `pending_`) : un agent désactivé est traité
comme un agent inconnu, **sans aucune écriture** — ni `lastLogin`, ni rafraîchissement de
ses données ProConnect.

En revanche `findBySub` / `findByEmail` **ne filtrent pas** les désactivés : `isEmailTaken`
s'en sert à la création, et masquer un désactivé ferait croire l'email libre pour violer
ensuite la contrainte d'unicité.

### 3. La suppression survit, avec un garde-fou

`deleteAgent` (service, donc valable pour tout appelant y compris un futur script ops)
compte d'abord les traces via `agentsRepository.countTraces` — cinq sources :
`parcours_actions`, `prospect_qualifications`, et les trois colonnes de
`parcours_prevention`. `agent_permissions` en est exclu : c'est de la configuration.

Zéro trace → suppression réelle (elle fonctionne enfin, grâce au `DROP NOT NULL`). Au moins
une trace → refus, avec le décompte lisible, et orientation vers la désactivation. La
modale d'administration anticipe ce verdict et remplace le bouton « Supprimer » par
« Désactiver » ; tant que le comptage n'est pas revenu, le bouton proposé est
« Désactiver » et inactif — un aller-retour raté ne peut pas exposer une suppression par
défaut.

### 4. Les envois groupés excluent les désactivés

Deux surfaces distinctes, à ne pas confondre.

**Le bouton « Copier les emails »** (`AgentsEmailExport`) est le vrai mécanisme d'envoi à
tous les agents : le super-admin colle la liste dans sa boîte. Il **exclut toujours** les
agents désactivés, y compris quand le filtre affiche « Tous ».

**Les listes de diffusion des structures** — `entreprises_amo.emails` (texte séparé par
`;`) et `allers_vers.emails` (`text[]`) — sont les destinataires réels des mails
applicatifs (validation AMO, arrêt d'accompagnement…). Elles vivent **hors** de la table
`agents`, sont saisies à la main et contiennent aussi des boîtes génériques : aucun flag sur
`agents` n'en retire personne. La désactivation y retire donc l'adresse **explicitement**,
dans la même transaction, avec aperçu de l'impact avant confirmation.

Exception : si l'adresse est la **dernière** de la structure, elle est **conservée** et
signalée. Vider la liste priverait l'AMO de tout destinataire et les mails partiraient dans
le vide — le mode de panne silencieux que ce projet a déjà rencontré. L'admin ajoute un
remplaçant, puis retire l'adresse depuis la fiche de la structure.

La réactivation, elle, **ne réinjecte pas** l'adresse : ces listes sont éditoriales, on ne
devine pas si elle doit revenir. Le message de succès le dit.

## Conséquences

- L'historique nominatif est préservé partout : « archivé par », « créé par », « qualifié
  par », « simulation modifiée par » continuent d'afficher le nom d'un agent parti.
- Réversible : la réactivation existe, `desactiver` est un no-op sur un agent déjà
  désactivé pour ne pas écraser la date d'origine.
- Un super-admin ne peut pas se désactiver lui-même (il se verrouillerait dehors).
- Un agent désactivé reste visible dans `/administration/agents` sous le filtre
  « Désactivés » ou « Tous », badge `Désactivé le JJ/MM/AAAA`, motif au survol.
- **Limite assumée** : rien n'empêche de re-saisir plus tard l'adresse d'un agent parti dans
  la liste d'une structure. Aligner durablement les deux serait un autre chantier, que la
  présence de boîtes génériques dans ces listes rend non trivial.
- **Limite assumée** : le message d'erreur de connexion reste « votre compte n'est pas
  enregistré dans le système », commun à l'agent inconnu et au désactivé. Un `console.warn`
  serveur porte l'`agentId` (jamais l'email) pour trancher au support.
- **Non traité** : `getCurrentUser` retourne encore un utilisateur valide quand la ligne
  `agents` a disparu (comportement pré-existant, asserté par un test). Un agent réellement
  supprimé garderait donc l'accès jusqu'à expiration de son JWT. Le risque est faible — on
  ne supprime que des agents sans aucune trace, donc en pratique jamais connectés.

## Alternatives écartées

**Neutraliser l'agent en base à la main** (brouiller `sub` et `email` pour casser le
matching ProConnect). C'était le geste de dépannage possible sans migration, et il révoque
bien l'accès en gardant les FK intactes. Écarté comme solution durable : aucune trace de la
date ni de l'auteur, l'agent reste indistinguable d'un actif dans le listing, et rien ne
touche aux listes de diffusion.

**Ajouter des colonnes snapshot partout** (sur `prospect_qualifications` et les trois
colonnes de `parcours_prevention`, comme `parcours_actions`) pour rendre la suppression
inoffensive. Plus lourd (migration + backfill + un point d'écriture par chemin) et sans
bénéfice : couper l'accès n'exige pas d'effacer la ligne.

**Dériver les listes de diffusion de la table `agents`.** Aurait rendu le retrait
automatique, mais ces listes contiennent des adresses qui ne correspondent à aucun agent.
Le lien resterait donc partiel, pour un refactor transverse.
