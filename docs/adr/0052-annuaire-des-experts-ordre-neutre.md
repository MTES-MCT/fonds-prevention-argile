# ADR-0052 : Annuaire des experts RGA, habilitation de structure et ordre neutre

**Date** : 2026-11-05
**Statut** : Accepté

## Contexte

Chaque département compte un à trois experts RGA validés par la DHUP, et l'arrêté de mai en autorise
de nouveaux. Leur liste n'existait nulle part dans l'application : AMO et Aller-vers les trouvaient par
leur carnet d'adresses, si bien que les nouveaux venus n'étaient guère sollicités.

Deux décisions se posaient. Où ranger les experts, alors qu'ADR-0051 vient de réunir AMO et Aller-vers
dans une même table `structures` ? Et comment les présenter sans fausser la concurrence : l'État publie
une liste d'entreprises privées, l'ordre d'affichage ne doit favoriser personne.

## Décision

> Un expert est une **troisième habilitation de structure**, qui ne donne aucun rôle. L'annuaire est
> présenté dans un **ordre alphabétique** sur la raison sociale, toujours le même, sans note ni mise en
> avant, avec la mention : « Liste des experts validés par la DHUP, présentés sans ordre de préférence.
> Vous êtes libre de faire appel à l'expert de votre choix. »

- Tables `experts` (`structure_id` unique, comme `entreprises_amo` et `allers_vers`) et
  `experts_departements` : un département en code officiel par ligne, avec le contact de réservation
  propre à ce département et, facultatif, l'expert qui se déplace chez le demandeur (nom, email,
  téléphone). Certaines sociétés réservent par une équipe administrative et envoient un expert nommé :
  l'agent sait ainsi qui viendra.
- Une entreprise à la fois AMO et experte a deux structures de même SIRET : une structure expert ne
  porte que l'expertise ([ADR-0053](0053-identite-portee-par-la-structure.md)). L'habilitation expert ne
  change le rôle d'aucun agent : `roleDepuisStructure` ne lit que AMO et Aller-vers.
- Le contact interne ne sort du serveur que pour le super-administrateur : deux projections,
  `ExpertAnnuaire` et `ExpertGestion`, construites champ par champ.
- Un expert qui part est désactivé, pas supprimé.
- L'annuaire des agents (`/espace-agent/experts`) montre un département, le territoire de l'agent ou
  les 11 départements du dispositif (`DEPARTEMENTS_ELIGIBLES_RGA`), regroupés par département, ceux sans
  expert compris ; l'ordre alphabétique vaut dans chacun. Aucun autre département n'est proposé, même au
  super-administrateur. Par défaut : le territoire de l'agent, ou tout s'il n'a aucun département
  (super-administrateur, Aller-vers couvert par des EPCI seulement). L'analyste ne sort jamais de ses départements.

## Options envisagées

### Ordre alphabétique stable — (retenue)

- Avantages : explicable en une phrase, identique d'un écran et d'une visite à l'autre, comme le demande
  le critère « toujours le même ordre neutre ».
- Inconvénients : avantage les raisons sociales en tête d'alphabet. Avec un à trois experts par
  département, l'écart reste faible, et la mention rappelle qu'aucun ordre n'est une préférence.

### Ordre aléatoire à chaque affichage

- Avantages : aucune entreprise n'est durablement en tête.
- Inconvénients : un agent ne retrouve pas un expert à la même place, deux agents ne voient pas la même
  liste, et le critère d'acceptation exige un ordre constant.

### Ordre aléatoire fixe (tirage stable par département)

- Avantages : neutre et constant.
- Inconvénients : impossible à expliquer simplement à un expert qui demande pourquoi il est dernier.

### Table d'experts indépendante, rattachée plus tard aux structures

- Avantages : suit la spécification à la lettre, qui prévoyait ce regroupement dans un ticket ultérieur.
- Inconvénients : le regroupement existe déjà (ADR-0051) ; il faudrait une seconde migration pour y
  revenir.

## Conséquences

### Positives

- Un seul annuaire, géré par le super-administrateur (saisie ou import Excel du référencement DHUP),
  consulté par les AMO, les Aller-vers, l'administrateur et l'analyste départemental (son territoire
  seulement), et repris dans le détail de chaque dossier.
- Les experts se gèrent dans la page Structures, comme les AMO et les Aller-vers, sans toucher aux rôles.

### Négatives / Risques

- Le texte de la mention reste à faire valider par la DHUP (SUJETS-A-TRAITER).
- Tout nettoyage des structures vides doit compter les experts, comme celui du seed
  (`structures-agents.sql`) : une structure expert n'a ni agent ni AMO ni Aller-vers, et serait
  supprimée à tort (la clé étrangère l'empêche, en erreur).

## Liens

- Code : `src/features/backoffice/administration/experts/`, `src/features/backoffice/espace-agent/experts/`,
  `src/shared/database/schema/experts.ts`, migration `0060_experts.sql`
- Documentation : [RBAC-ROLES.md](../security/RBAC-ROLES.md), [import-structures.md](../ops/import-structures.md)
- ADR liées : [ADR-0051](0051-roles-amo-aller-vers-portes-par-la-structure.md),
  [ADR-0053](0053-identite-portee-par-la-structure.md), [ADR-0042](0042-choix-amo-parmi-plusieurs.md)
