# Page détail d'une demande d'accompagnement AMO

## Vue d'ensemble

Cette page permet aux AMO (Assistants Maîtrise d'Ouvrage) de consulter le détail d'une demande d'accompagnement et d'y répondre directement depuis l'interface de l'espace AMO.

## Route

`/espace-amo/demande/[id]`

## Fonctionnalités

### Composants principaux

1. **ReponseAccompagnement**
   - Sélection de la réponse via un select DSFR
   - 3 options possibles :
     - J'accompagne ce demandeur et j'atteste qu'il est éligible
     - J'ai pris contact mais il n'est pas éligible (+ commentaire obligatoire)
     - Je n'accompagne pas ce demandeur
   - Redirection automatique vers l'accueil après soumission

2. **InfoDemandeur**
   - Affichage des informations du demandeur
   - Bouton de copie du mail dans le presse-papier
   - Carte DSFR avec icônes

3. **InfoLogement**
   - Année de construction
   - Nombre de niveaux
   - État de la maison (avec badges colorés)
   - Indemnisation passée RGA
   - Nombre d'habitants
   - Niveau de revenu (avec badges colorés)

4. **CarteLogement**
   - Carte RGA avec zoom sur le logement
   - Sélection verrouillée (prop `locked={true}`)
   - Affichage des badges (code INSEE, RNB ID)
   - Import dynamique pour éviter les problèmes SSR

5. **AFaire**
   - Liste statique des actions à effectuer
   - Rappels des étapes à suivre

### Services

- `demande-detail.service.ts` : Récupération des données de la demande avec vérification des permissions
- `demande-detail.actions.ts` : Server actions pour gérer les réponses (accepter, refuser pour non-éligibilité, refuser accompagnement)

### Sécurité

- Vérification que l'AMO connecté est bien propriétaire de la demande
- Les administrateurs peuvent voir toutes les demandes
- Validation côté serveur des commentaires

## Refactoring RgaMap

La carte RGA a été étendue avec un nouveau prop :

```typescript
interface RgaMapProps {
  // ... autres props
  locked?: boolean; // Empêche la sélection d'un autre bâtiment
}
```

Quand `locked={true}`, la sélection de bâtiment est désactivée, mais l'affichage reste interactif (zoom, navigation).

## Tests

Fichier de tests : `src/features/backoffice/espace-amo/demande/actions/demande-detail.actions.test.ts`

Tests couverts :
- Récupération des détails d'une demande
- Acceptation de l'accompagnement
- Refus pour non-éligibilité (avec validation du commentaire)
- Refus de l'accompagnement
- Gestion des erreurs d'authentification

## Migration depuis l'ancienne page validation

L'ancienne page `/espace-amo/validation/[token]` reste fonctionnelle pour la compatibilité avec les liens email existants, mais la nouvelle interface offre :
- Plus d'informations sur le logement
- Une meilleure visualisation (carte verrouillée)
- Une interface plus cohérente avec le reste de l'espace AMO
- Une navigation directe depuis le tableau de demandes

## Architecture des fichiers

```
app/(backoffice)/espace-amo/demande/[id]/
├── components/
│   ├── AFaire.tsx
│   ├── CarteLogement.tsx
│   ├── InfoDemandeur.tsx
│   ├── InfoLogement.tsx
│   └── ReponseAccompagnement.tsx
├── page.tsx
└── README.md

features/backoffice/espace-amo/demande/
├── actions/
│   ├── demande-detail.actions.test.ts
│   ├── demande-detail.actions.ts
│   └── index.ts
├── domain/
│   └── types/
│       ├── demande-detail.types.ts
│       └── index.ts
└── services/
    └── demande-detail.service.ts
```
