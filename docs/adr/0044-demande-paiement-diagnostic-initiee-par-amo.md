# ADR-0044 : La demande de paiement du diagnostic est initiée par l'AMO mandataire financier

**Date** : 2026-10-01
**Statut** : Accepté

## Contexte

À l'étape diagnostic, le formulaire Démarches Numériques (DN) qui porte le rapport et la
demande de paiement était créé par le demandeur, depuis `/mon-compte`. Quand l'AMO est
**mandataire financier** (`parcours_amo_validations.est_mandataire_financier = true`), la
subvention lui est versée directement : elle attendait donc, pour être payée, une démarche
d'un demandeur qui n'y a aucun intérêt direct.

Contrainte DN à connaître : un prérempli créé par l'API n'appartient à personne tant qu'il
n'est pas ouvert. C'est le compte DN qui ouvre le lien `/commencer/…?prefill_token=` qui en
devient propriétaire. DN gère nativement le dépôt pour un tiers.

## Décision

> Pour un dossier suivi par une AMO mandataire financier, la création du formulaire de l'étape
> diagnostic revient aux agents de cette AMO, depuis le détail dossier de l'espace agent. Le
> demandeur n'a plus de bouton : son espace lui dit que son AMO s'en charge.

Quatre règles en découlent.

- **Le dossier DN appartient à l'AMO.** Le demandeur ne peut pas l'ouvrir : aucun lien DN ne
  lui est proposé sur ce dossier, il suit l'avancement par les callouts et les dates.
- **On mémorise qui a créé le prérempli** (`dossiers_demarches_simplifiees.initie_par`,
  `demandeur` par défaut). Sans cela, rien ne distingue un dossier déposé par le demandeur
  avant la bascule — dont le lien reste valide pour lui — d'un dossier de l'AMO.
- **Le blocage est serveur.** `createDiagnosticDossier` et `recreerFormulaireDemandeur`
  refusent le demandeur ; l'action de l'AMO vérifie rôle, entreprise rattachée et mandat.
- **L'arrêt d'accompagnement est gelé à l'étape diagnostic**, pour le demandeur comme pour
  l'AMO (`estArretGeleAuDiagnostic`). Détacher l'AMO laisserait sur son compte DN un dossier
  que personne ne suit.

La création trace une action système (`formulaire_initie_par_amo`) et émet un évènement Brevo
dédié (`demande_paiement_initiee_par_amo`), en plus du `dn_update` de création.

## Options envisagées

### Option A — L'AMO crée et possède le dossier DN (retenue)

- Avantages : l'AMO ne dépend plus du demandeur ; les demandes de complément de la DDT
  arrivent à celui qui peut y répondre ; dépôt pour un tiers natif côté DN.
- Inconvénients : le demandeur perd l'accès au dossier DN ; le dossier est lié au compte DN
  de l'agent qui l'ouvre, pas à la structure.

### Option B — L'AMO génère le lien, le demandeur l'ouvre

- Avantages : le demandeur reste propriétaire, aucun changement d'affichage.
- Inconvénients : ne résout rien — l'AMO attend toujours une action du demandeur.

### Option C — Déduire le créateur de l'historique d'actions, sans colonne

- Avantages : pas de migration.
- Inconvénients : l'audit est best-effort et ne doit pas porter une règle d'affichage ; le
  demandeur lit ses dossiers sans jointure sur `parcours_actions`.

## Conséquences

### Positives

- Une seule règle, `estFormulaireConfieAAmo`, partagée par l'écran demandeur, l'écran agent
  et les gardes serveur. Elle est écrite par étape (`STEPS_FORMULAIRE_PAR_AMO`) : l'étendre
  aux devis ou aux factures est une ligne.
- Le préremplissage du diagnostic lit désormais la simulation effective (agent d'abord) :
  un dossier créé par un agent n'avait pas de commune, donc pas de routage vers la DDT.

### Négatives / Risques

- Le dossier vit sur le compte DN d'un agent : un collègue ne le reprend que par invitation
  côté DN.
- Le gel de l'arrêt au diagnostic revient sur la borne haute d'ADR-0018, qui rouvrait
  l'arrêt dès l'éligibilité tranchée. Il vaut pour tous les dossiers, pas seulement ceux à
  mandataire financier. L'arrêt redevient possible aux devis.
- Une demande d'arrêt posée avant l'entrée au diagnostic ne peut plus qu'être refusée par
  l'AMO pendant cette étape.

### Migration

- Migration `0052` : colonne `initie_par`, valeur `demandeur` pour l'existant.
- Dossiers en cours avec AMO mandataire financier : un dossier déjà **déposé** par le
  demandeur reste le sien. Un **brouillon** non déposé ne lui est plus proposé ; l'AMO le
  retire par « Gérer → Réinitialiser le formulaire », puis initie le sien.
- Côté Brevo : brancher une Automation sur `demande_paiement_initiee_par_amo`, et ne plus
  inviter ces demandeurs (`EST_MANDATAIRE = true`) à transmettre eux-mêmes leur diagnostic.

## Liens

- Règle : `src/features/parcours/amo/domain/value-objects/formulaire-par-amo.ts`
- Entrées de la règle : `src/features/parcours/amo/services/formulaire-par-amo.service.ts`
- Action AMO : `src/features/backoffice/espace-agent/dossiers/actions/initier-formulaire-diagnostic.actions.ts`
- Garde de création : `src/features/parcours/core/services/diagnostic.service.ts`
- Documentation : [FLOW-AND-SYNC §2.13](../parcours/FLOW-AND-SYNC.md), [RBAC-ROLES §6.1.4](../security/RBAC-ROLES.md),
  [BREVO-LIFECYCLE §2](../emails/BREVO-LIFECYCLE.md)
- ADR liés : [ADR-0018](0018-arret-accompagnement-amo.md), [ADR-0027](0027-tentative-prefill-vs-dossier-confirme.md)
