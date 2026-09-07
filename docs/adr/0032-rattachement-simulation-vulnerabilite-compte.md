# ADR-0032 : Rattachement de la simulation de vulnérabilité au compte demandeur

**Date** : 2026-09-07
**Statut** : Accepté

## Contexte

Le simulateur de vulnérabilité RGA (`/vulnerabilite-rga`, [ADR-0030](0030-simulateur-vulnerabilite-rga.md))
écrit une ligne anonyme best-effort dans `vulnerabilite_simulations` pour les stats admin
([ADR-0031](0031-stats-vulnerabilite-matomo-bdd.md)). Un agent consultant le dossier d'un demandeur n'avait
aucune visibilité sur son résultat de vulnérabilité. Besoin : rattacher cette simulation au compte du
demandeur quand on le connaît, et l'afficher côté agent (dossiers, prospects, demandes), sans dupliquer les
données ni casser l'anonymat de la table stats pour les visiteurs qui restent anonymes.

## Décision

> `parcours_prevention` porte un pointeur nullable `vulnerabilite_simulation_id` (FK vers
> `vulnerabilite_simulations.id`, `onDelete: set null`) — même philosophie que le pointeur courant
> `dossiers_demarches_simplifiees` vers un dossier DS ([ADR-0027](0027-tentative-prefill-vs-dossier-confirme.md)) :
> on lit **depuis** le parcours, jamais l'inverse. `vulnerabilite_simulations` reste strictement inchangée
> (aucune FK entrante). Le pointeur est posé immédiatement si le demandeur est déjà connecté au moment de la
> simulation ; sinon un **cookie httpOnly** porte l'UUID de la ligne créée, pour un rattachement différé si la
> connexion intervient plus tard dans la même session — mirror exact de `FC_CLAIM_TOKEN`
> (`franceconnect.service.ts`).

## Options envisagées

### 1. Sens de la relation : pointeur sur `parcours_prevention` (retenue) vs FK sur `vulnerabilite_simulations`

**Option A — pointeur sur `parcours_prevention` (retenue)**

- Avantages : correspond à l'usage réel (« afficher le dossier du demandeur, voir s'il a une simulation », pas
  l'inverse) — lecture en une seule colonne, pas de requête `ORDER BY ... LIMIT 1`. Aligné sur le pattern déjà
  établi dans ce repo pour `dossiers_demarches_simplifiees` (pointeur courant + registre séparé,
  [ADR-0027](0027-tentative-prefill-vs-dossier-confirme.md)). `vulnerabilite_simulations` reste intacte, aucun
  risque sur les stats.
- Inconvénients : un même id de simulation pourrait en théorie être pointé par 2 parcours (cf. §Conséquences) —
  jugé non exploitable et hors du modèle de menace réaliste ici.

**Option B — FK `vulnerabilite_simulations.user_id → users.id`**

- Avantages : normalisation « classique » d'une relation 1-N (un utilisateur peut faire plusieurs simulations).
- Inconvénients : mauvais sens pour l'usage réel (nécessite un tri par date à chaque lecture) ; rejetée après
  retour explicite lors de la conception.

### 2. Rattrapage si connexion différée : cookie httpOnly (retenue) vs replay du store client

**Option A — cookie httpOnly portant l'UUID de la simulation (retenue)**

- Avantages : ne transporte qu'un UUID opaque (`gen_random_uuid()`, 122 bits d'entropie, même mécanisme que
  tous les id de ce schéma) — jamais les réponses elles-mêmes, contrairement au mécanisme de migration du
  simulateur d'éligibilité (`migrateSimulationDataToDatabase`, qui rejoue tout `rgaSimulationData` depuis le
  localStorage). httpOnly = illisible en JS, donc non exfiltrable par XSS. `SameSite=Lax` survit à la
  redirection externe FranceConnect. Réutilise `getCookieOptions()`/`SESSION_DURATION` déjà en place pour
  `FC_CLAIM_TOKEN` — aucune nouvelle primitive de sécurité introduite.
- Inconvénients : ne couvre que le rattrapage dans la même session navigateur (cookie), pas une connexion des
  semaines plus tard sur un autre appareil — jugé suffisant pour ce cas d'usage (assumé, cf. Hors périmètre).

**Option B — dupliquer les réponses dans le store client (mirror exact de l'éligibilité)**

- Avantages : aucun.
- Inconvénients : duplication de données (déjà en base dans `vulnerabilite_simulations`), transporte les
  réponses du formulaire en clair dans le navigateur au lieu d'un simple identifiant opaque — surface
  d'exposition inutilement plus large pour un bénéfice nul. Rejetée après retour explicite lors de la
  conception (« attention à la sécurité et aux fuites de données »).

## Conséquences

### Positives

- Aucune duplication de données : une seule ligne par simulation, dans `vulnerabilite_simulations`.
- `vulnerabilite_simulations` reste utilisable pour les stats exactement comme avant (ADR-0031), aucune
  modification de cette table.
- Sécurité alignée sur un pattern déjà audité et en production dans ce repo (`FC_CLAIM_TOKEN`).

### Négatives / Risques

- Un même `vulnerabilite_simulation_id` pourrait être pointé par 2 parcours différents si le cookie était
  partagé entre 2 comptes du même navigateur (poste partagé). Non exploitable : la ligne ne contient aucune
  donnée nominative (département, réponses de formulaire, score — cf. ADR-0031) ; aucune garde supplémentaire
  ajoutée.
- Pas de rattrapage rétroactif si la connexion intervient après l'expiration du cookie (1h) ou sur un autre
  appareil — assumé, cf. ci-dessous.

### Hors périmètre (assumé)

- Pas de rattrapage rétroactif au-delà de la fenêtre du cookie (1h, `SESSION_DURATION.vulnerabiliteSimulationLink`).
- Pas de purge/anonymisation RGPD dédiée au-delà de `onDelete: set null` sur la FK.
- Pas d'émission d'évènement Brevo à ce rattachement (contrairement à `SIMULATION_ENREGISTREE` pour
  l'éligibilité).
- Pas d'édition agent de cette donnée : lecture seule côté dossier/prospect/demande.

## Liens

- [ADR-0027](0027-tentative-prefill-vs-dossier-confirme.md) — pattern pointeur courant + registre séparé
- [ADR-0030](0030-simulateur-vulnerabilite-rga.md) — architecture du simulateur de vulnérabilité
- [ADR-0031](0031-stats-vulnerabilite-matomo-bdd.md) — stats Matomo/BDD, `vulnerabilite_simulations`
- `src/shared/database/schema/parcours-prevention.ts` — colonne `vulnerabilite_simulation_id`
- `src/features/vulnerabilite-rga/actions/enregistrer-resultat.actions.ts` — pointeur immédiat ou cookie
- `src/features/parcours/core/actions/parcours-vulnerabilite-link.actions.ts` — rattrapage à la connexion
- `src/features/auth/adapters/franceconnect/franceconnect.service.ts` — `FC_CLAIM_TOKEN`, pattern mirroré
