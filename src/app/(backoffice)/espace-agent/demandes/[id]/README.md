# Page détail d'une demande d'accompagnement AMO

## Vue d'ensemble

Cette page permet à l'AMO sollicitée de consulter une demande d'accompagnement (validation `en_attente`) et d'y répondre depuis l'espace agent.

## Route

`/espace-agent/demandes/[id]`, où `id` est l'identifiant de la validation AMO. Une demande archivée redirige vers `/espace-agent/dossiers/[id]`.

Le lien de l'email envoyé à l'AMO (`/amo/validation/[token]`) et `/espace-agent/validation/[token]` redirigent vers cette page.

## Fonctionnalités

### Composants

1. **ReponseAccompagnement** (`components/`)
   - Sélection de la réponse via un select DSFR, 3 options :
     - J'accompagne ce demandeur et j'atteste qu'il est éligible (+ mandataire financier, note facultative)
     - Le demandeur est peut-être éligible, mais ma structure ne va pas l'accompagner (raison obligatoire : poursuite seul ou archivage, cf. FLOW-AND-SYNC § 2.8)
     - J'ai pris contact avec ce demandeur, mais il n'est pas éligible (raison obligatoire)
   - Modale de confirmation (`ConfirmationReponseModal`) après soumission

2. Composants partagés de l'espace agent (`../../shared`) : `InfoDemandeur`, `InfoLogement` (carte du logement en `locked`), `QualificationAllersVers`, `ParcoursDemandeur`, `ActionsRealisees`, `AFaire`, `RenvoyerInvitationButton` ; plus `VulnerabiliteDossier` et `PiecesJustificatives`.

### Services

- `demande-detail.service.ts` (`getDemandeDetail`) : récupération de la demande avec vérification des permissions
- `demande-detail.actions.ts` : `accepterAccompagnement`, `refuserDemandeNonEligible`, `refuserAccompagnementEligible`, `getNextDemandeurEnAttente`

### Sécurité

- `exigerAccesEspaceAgent()` en tête de la page et de `generateMetadata` : l'administrateur est refusé, comme tout rôle hors espace agent
- AMO : seulement les demandes de son entreprise ; super-administrateur : toutes, en lecture seule ; analyste départemental : celles de son territoire, en lecture seule
- Les réponses sont gardées côté serveur (`verifyAmoOwnership`) ; voir [RBAC-ROLES](../../../../../../docs/security/RBAC-ROLES.md)

## Tests

- `src/features/backoffice/espace-agent/demandes/actions/demande-detail.actions.test.ts`
- `src/features/backoffice/espace-agent/demandes/services/demande-detail.service.test.ts`

## Architecture des fichiers

```
app/(backoffice)/espace-agent/demandes/[id]/
├── components/
│   ├── ConfirmationReponseModal.tsx
│   └── ReponseAccompagnement.tsx
├── page.tsx
└── README.md

features/backoffice/espace-agent/demandes/
├── actions/
│   ├── demande-detail.actions.ts
│   └── demande-detail.actions.test.ts
├── domain/types/
│   └── demande-detail.types.ts
└── services/
    ├── demande-detail.service.ts
    └── demande-detail.service.test.ts
```
