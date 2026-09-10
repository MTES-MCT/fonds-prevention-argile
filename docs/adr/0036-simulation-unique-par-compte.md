# ADR-0036 : Une simulation par compte, modifiable et arbitrée

**Date** : 2026-09-09
**Statut** : Accepté

## Contexte

Un demandeur pouvait empiler les simulations sans jamais s'en apercevoir.

Le simulateur public (`/simulateur`) est ouvert à tous, y compris à un demandeur déjà
connecté et déjà titulaire d'un dossier. À la fin du parcours, deux chemins écrivaient en
base **en écrasant** la simulation existante :

- `SimulateurFormulaire` appelle `migrateSimulationDataToDatabase` dès que l'utilisateur
  est authentifié (ADR-0034) ;
- `useMigrateRGAToDB`, au retour sur `/mon-compte`, rattache la simulation faite avant
  connexion — son commentaire disait déjà « écrase l'ancienne simulation si existante ».

Trois conséquences, toutes silencieuses :

1. **Perte de données sans consentement.** Une simulation refaite à moitié, ou faite pour
   la maison d'un proche, remplaçait le dossier réel. L'ancienne version n'était nulle part.
2. **Verdict d'éligibilité rejoué à l'aveugle.** Depuis l'ADR-0034, une simulation non
   éligible archive le dossier et écrit une qualification. Un écrasement pouvait donc
   archiver un dossier vivant, ou dé-archiver un dossier réellement inéligible.
3. **Aucun moyen de corriger une erreur.** À l'inverse, le demandeur qui avait fait une
   faute de saisie n'avait **aucun écran** pour la corriger : seul un agent le pouvait,
   depuis `/espace-agent/edition-donnees-simulation/[id]`. Refaire la simulation entière
   était le seul recours — celui-là même qui écrase.

Le cas le plus fréquent est le plus dommageable : simuler sans être connecté, puis se
connecter avec un compte FranceConnect qui porte déjà un dossier.

## Décision

> Un compte porte **une** simulation. Elle se modifie, elle ne se recrée pas. Quand deux
> versions se présentent, c'est le demandeur qui tranche.

Trois règles :

1. **Le simulateur public est fermé à qui a déjà une simulation.** `/simulateur` redirige
   vers `/mon-compte/simulation`. La garde est dans la page, pas dans les CTA : quatorze
   liens y mènent depuis des JSON de contenu et des composants.
2. **La modification passe par l'écran d'édition des agents.** `SimulateurEdition` est
   partagé ; il reçoit son enregistrement et ses textes par le contexte
   (`onSave`, `audience`), et ne connaît plus l'action du back-office.
3. **Deux simulations divergentes déclenchent un arbitrage.** Au retour sur `/mon-compte`,
   une modale compare les deux versions champ par champ, signale celles qui changent
   l'éligibilité, et laisse choisir. Fermer sans choisir conserve la version du compte —
   le seul choix qui n'écrit rien.

L'édition est fermée dans deux cas, tous deux réversibles (`peutModifierSaSimulation`) :

| Verrou                                                                      | Motif                                                                                                                                   | Levée                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `rgaSimulationDataAgent` non nul                                            | La correction de l'agent prime à l'affichage (`getEffectiveRGAData`, AGENT-first). Éditer produirait un écran sans effet visible.       | Aucune : le dossier est suivi par un professionnel |
| Formulaire d'éligibilité chez la DDT (`EN_CONSTRUCTION` / `EN_INSTRUCTION`) | Le dossier déposé déclare ces données et le préremplissage REST ne sait que créer (même motif qu'ADR-0018 amendé, FLOW-AND-SYNC §2.7.1) | À la décision rendue                               |

## Options envisagées

### Option A — Une simulation par compte, modifiable, avec arbitrage (retenue)

- Avantages : aucune donnée n'est perdue sans un choix explicite ; le demandeur peut enfin
  corriger une erreur ; l'écran d'édition est mutualisé avec celui des agents, donc une
  seule surface à maintenir ; le verdict d'éligibilité (ADR-0034) n'est plus rejoué à
  l'insu de personne.
- Inconvénients : corriger un seul champ impose de retraverser les dix étapes du
  simulateur (l'écran agent fonctionne ainsi) ; `/simulateur` devient une route dynamique,
  puisqu'elle lit la session.

### Option B — Historiser les simulations et garder la dernière

- Avantages : aucune perte, aucun écran d'arbitrage à écrire.
- Inconvénients : une table de plus et une migration, pour un besoin que personne n'a
  exprimé (personne ne demande à consulter ses anciennes simulations) ; surtout, cela ne
  répond pas à la question posée — laquelle fait foi ? Le verdict d'éligibilité continuerait
  de basculer tout seul.

### Option C — Bloquer purement la re-simulation, sans écran d'édition

- Avantages : le plus simple à écrire.
- Inconvénients : laisse le demandeur prisonnier de sa faute de saisie, ce qui est
  précisément l'une des trois causes du problème. Reporte la charge sur les AMO et les
  Aller-vers, appelés pour corriger un chiffre.

### Option D — Faire trancher le serveur (la plus récente gagne)

- Avantages : aucun écran, aucune interaction.
- Inconvénients : c'est le comportement actuel, celui qu'on corrige. « La plus récente »
  n'est pas « la bonne » : une simulation abandonnée en cours de route est plus récente
  qu'un dossier complet.

## Conséquences

### Positives

- Le dossier d'un demandeur ne change plus d'état sans qu'il l'ait voulu.
- La correction d'une simulation devient possible sans passer par un agent.
- `SIMULATION_FIELDS` devient la source unique du couple (extraction, formatage) d'un champ
  de simulation, jusqu'ici dupliqué entre `agent-edit-info.service.ts` et `InfoLogement`.
- `migrateSimulationDataToDatabase` refuse d'écraser côté **serveur** : la garde ne dépend
  pas de la redirection de `/simulateur`, ce qui couvre aussi `/embed-simulateur`, non gardé.

### Négatives / Risques

- **`/simulateur` n'est plus rendue statiquement** (lecture de session). Elle reste rendue
  côté serveur et indexable, mais perd le cache statique.
- **Modifier son adresse change son territoire**, donc l'AMO ou l'Aller-vers responsable.
  Rien ne réassigne l'accompagnement : le risque préexistait côté agent, il devient plus
  fréquent.
- **Le parcours d'édition est long** : dix étapes pour corriger un champ. Un accès direct
  au champ serait un chantier distinct.
- La numérotation des cartes de `/mon-compte` décale (le simulateur devient la carte 1).

### Migration

Aucune migration de schéma. `parcours_prevention.rga_simulation_data` reste le seul
emplacement de la simulation du demandeur ; la colonne agent est inchangée.

Les comptes portant déjà deux simulations divergentes n'existent pas : jusqu'ici la seconde
écrasait la première.

## Liens

- Écran partagé : `src/features/simulateur/components/SimulateurEdition.tsx`,
  `components/shared/SimulateurContext.tsx`
- Verrous d'édition : `src/features/parcours/core/domain/value-objects/edition-simulation.ts`
- Enregistrement demandeur : `src/features/parcours/core/actions/enregistrer-simulation-demandeur.actions.ts`
- Arbitrage : `src/features/parcours/core/hooks/useMigrateRGAToDB.ts`,
  `components/ChoixSimulationModal.tsx`
- Comparaison : `src/features/simulateur/domain/services/comparaison-simulations.service.ts`
- Voir aussi : [ADR-0034](0034-simulation-non-eligible-demandeur.md) (verdict et archivage),
  [ADR-0020](0020-correction-simulation-agent-post-eligibilite.md) (correction agent),
  [FLOW-AND-SYNC §2.12](../parcours/FLOW-AND-SYNC.md)
