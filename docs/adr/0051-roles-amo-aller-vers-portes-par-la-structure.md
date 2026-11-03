# ADR-0051 : Rôles AMO et Aller-vers portés par la structure

**Date** : 2026-11-03
**Statut** : Accepté

## Contexte

Le rôle d'un agent était stocké sur l'agent (`agents.role`), avec deux rattachements optionnels
(`entreprise_amo_id`, `allers_vers_id`) que rien ne contraignait. Une même structure qui joue les
deux rôles (Soliha, Adil) existait deux fois, une ligne `entreprises_amo` et une ligne
`allers_vers`, et c'était à chaque agent de porter « AMO et Aller-vers » avec les deux liens. Rien
n'empêchait un agent d'être rattaché à l'AMO d'une structure et à l'Aller-vers d'une autre, ni deux
agents d'une même structure d'avoir des rôles différents.

Le besoin métier : regrouper les structures, leur donner un ou deux rôles (Expert à terme), et qu'un
agent rattaché à une structure en obtienne les rôles.

Mesuré en production le 2 novembre 2026 : 18 AMO, 17 Aller-vers, 12 paires reliées par des agents
hybrides, toutes en 1:1. Les deux lignes d'une paire ne se ressemblent pas : contacts différents sur
6 paires, noms différents sur 5, et territoires légitimement différents sur 3 Soliha du Nord, où
Citémétrie est l'AMO des EPCI que Soliha couvre en Aller-vers. Fusionner les deux lignes en une
seule perdait donc de l'information et faussait la couverture territoriale.

## Décision

> Une table `structures` porte l'identité de la structure ; ses lignes `entreprises_amo` et
> `allers_vers` sont ses habilitations, et l'agent hérite des rôles de sa structure.

- `structures (id, nom)` ; `entreprises_amo.structure_id` et `allers_vers.structure_id` NOT NULL,
  UNIQUE, `restrict` : une structure a au plus une habilitation de chaque sorte. Contacts, horaires,
  adresses et territoires restent sur chaque ligne, inchangés.
- `agents.structure_id` (nullable, `restrict`). Le rôle se lit ainsi
  (`resoudreRoleAgent`, `shared/domain/value-objects/role-structure.ts`) : avec une structure, AMO,
  Aller-vers ou les deux selon ses habilitations ; sans structure, le rôle plateforme stocké
  (super-administrateur, administrateur, analyste). Un agent de structure dont la structure n'a plus
  d'habilitation, ou un rôle de structure stocké sans structure, n'a **aucun rôle** : refusé partout.
- `agentsRepository` ne renvoie que des agents résolus (`Agent`) ; `entrepriseAmoId` et
  `allersVersId` y sont ceux des lignes de la structure, donc **les mêmes qu'avant** pour tous les
  agents existants. Périmètres, couverture AMO, responsable, Brevo et pages publiques n'en changent pas.
- Les colonnes `role`, `entreprise_amo_id`, `allers_vers_id` de `agents` deviennent `legacy*` côté
  TypeScript : **écrites, jamais lues**, pour qu'un retour à la version précédente retrouve des rôles
  justes. Elles disparaîtront dans une PR de nettoyage, une release plus tard.

## Options envisagées

### Option A — Table parente, habilitations séparées (retenue)

- Avantages : aucune donnée fusionnée ni perdue ; la FK des validations vers `entreprises_amo` ne
  bouge pas ; une structure purement Aller-vers ne peut pas devenir candidate AMO ; le rôle Expert
  s'ajoute par une table `experts` à `structure_id`.
- Inconvénients : une jointure de plus pour lire un agent ; le nom affiché reste celui de chaque ligne.

### Option B — Fusionner les deux tables en une table `structures` à rôles

- Avantages : une seule ligne par structure, un seul formulaire.
- Inconvénients : contacts et territoires divergents à arbitrer à la main sur 6 paires ;
  la FK des 1 938 validations AMO à migrer ; perte de la distinction de territoire des Soliha du Nord.

### Option C — Garder le rôle sur l'agent, ajouter une contrainte de cohérence

- Avantages : aucune migration de données.
- Inconvénients : ne répond pas au besoin (le rôle ne vient pas de la structure) ; deux agents d'une
  même structure peuvent toujours diverger.

## Conséquences

### Positives

- Rattacher un agent revient à choisir sa structure ; ses rôles suivent ceux de la structure.
- Le rôle est relu en base à chaque requête (`getCurrentUser`, PR #439) : une structure qui perd
  son habilitation coupe ses agents à la requête suivante, session ouverte comprise.
- Supprimer une ligne AMO ou Aller-vers est refusé si des agents de la structure perdaient leur
  seul rôle. La vérification se fait sous verrou exclusif de la structure, dans la transaction de
  la suppression ; rattacher un agent pose un verrou partagé, et les purges avant import verrouillent
  les structures visées. Deux suppressions simultanées ne peuvent donc plus retirer ensemble les
  deux habilitations d'une structure qui emploie des agents.

### Négatives / Risques

- Deux agents Aller-vers gagnent le rôle AMO en production (Adil 32, Soliha Métropole Nord), leur
  structure ayant les deux habilitations. Accord des deux structures requis avant la mise en prod ;
  le modèle ne permet pas de garder un agent Aller-vers seul dans une structure à deux rôles.
- Un agent à rôle de structure sans aucun rattachement n'a plus de rôle (il était déjà refusé à
  l'espace agent, il perd en plus les statistiques de l'administration).
- Le dépôt de base n'ouvre pas de vraie transaction (`BaseRepository.transaction`) : les écritures
  liées à une structure passent par `db.transaction`.

### Migration

Migration `0059`, additive et dans une seule transaction :

1. Garde : une AMO ou un Aller-vers relié à deux partenaires par des agents hybrides lève une
   exception, rien n'est écrit et le déploiement échoue.
2. Une structure par paire (nom de l'AMO), puis une par ligne restante.
3. `agents.structure_id` déduit du rattachement que lit le rôle (`entreprise_amo_id` pour `amo`,
   `allers_vers_id` pour `allers_vers`, les deux pour l'hybride), pour les seuls rôles de structure.
4. Trigger transitoire `BEFORE INSERT` sur `entreprises_amo` et `allers_vers` : une ligne insérée
   sans structure (ancien code pendant le postdeploy, ou après un retour arrière) en reçoit une ;
   un upsert garde celle de la ligne existante.
5. Trigger transitoire sur `agents` (`INSERT`, et `UPDATE` de `role` ou des rattachements) : quand
   l'écriture ne fixe pas `structure_id`, comme celles de l'ancien code, il le recalcule par la
   règle du point 3. Un rôle plateforme n'a pas de structure, un hybride relié à deux structures
   est refusé, et une mise à NULL par clé étrangère (ligne supprimée) laisse la structure en place.

Les deux triggers sont retirés avec les colonnes héritées.

Retour arrière : redéployer la version précédente suffit, rien n'étant supprimé ni mis à NULL.

## Page « Structures » (même PR)

Livrée avec le changement de modèle : sans elle, une AMO et un Aller-vers importés séparément ne
pourraient plus partager d'agents, alors que le formulaire agent le permettait avant.

`/administration/structures`, réservée au super-administrateur (elle change les droits des agents) :

- **Renommer** : nom administratif seul, sans effet sur les droits ni sur les noms affichés aux
  demandeurs.
- **Fusionner** une structure dans une autre : ses habilitations et ses agents la rejoignent, puis
  elle disparaît. Refusé si les deux ont une habilitation du même type. Les deux structures sont
  verrouillées dans l'ordre de leurs identifiants et les colonnes héritées réalignées. L'écran
  nomme, avant confirmation, les agents qui gagnent un rôle.
- **Détacher** une habilitation d'une structure qui a les deux : elle part dans une nouvelle
  structure à son nom, sans agent ; les agents restent et perdent ce rôle.

Pas d'historique de ces opérations, comme pour la gestion des agents : un log technique seulement.
Un retour arrière les conserve, l'ancien code lisant les colonnes héritées réalignées.

## Liens

- PR #439 : rôle relu en base, plus dans le JWT (prérequis)
- PR #440 : seed, une seule paire AMO / Aller-vers pour les agents hybrides (prérequis)
- Schéma : `src/shared/database/schema/structures.ts`, `agents.ts`, `entreprises-amo.ts`, `allers-vers.ts`
- Migration : `src/shared/database/migrations/0059_roles_portes_par_structure.sql`
- Lecture : `src/shared/database/repositories/agents.repository.ts`, `structures.repository.ts`
- Documentation : [RBAC-ROLES §2](../security/RBAC-ROLES.md), [ARCHITECTURE §5](../ARCHITECTURE.md), [db-local](../ops/db-local.md)
