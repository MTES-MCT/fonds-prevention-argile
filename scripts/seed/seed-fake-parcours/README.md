# Seed Fake Parcours

Données de test pour l'espace AMO (Accueil, Demandes, Dossiers, Statistiques) et l'espace Allers-Vers (Prospects).

## Configuration

1. Récupérer l'ID de votre entreprise AMO :
   ```sql
   SELECT id, nom FROM entreprises_amo;
   ```

2. Remplacer `XXXXXXXXXXXXXXXXXXX` par cet ID dans les fichiers `03-validations-amo.sql`

## Exécution

### Option 1 : Données complètes (AMO + Prospects)

Exécuter les scripts **dans l'ordre** :

```bash
psql -f 00-init.sql
psql -f 01-users.sql
psql -f 01b-users-prospects.sql    # Nouveaux utilisateurs pour prospects
psql -f 02-parcours.sql
psql -f 03-validations-amo.sql
psql -f 04-dossiers-ds.sql
psql -f 05-prospects-sans-amo.sql  # Nouveaux prospects pour Allers-Vers
psql -f 99-verification.sql
```

### Option 2 : Uniquement les prospects (sans AMO)

Si vous voulez seulement tester l'espace Allers-Vers :

```bash
psql -f 00-init.sql
psql -f 01b-users-prospects.sql
psql -f 05-prospects-sans-amo.sql
```

Ou via Drizzle Studio, copier-coller chaque script séquentiellement.

## Données créées

| Type | Quantité |
|------|----------|
| Utilisateurs (AMO) | 40 |
| Utilisateurs (Prospects) | 30 |
| **Total utilisateurs** | **70** |
| Parcours (avec AMO) | 40 |
| Parcours (sans AMO / Prospects) | 30 |
| **Total parcours** | **70** |
| Validations AMO | 30 |
| Dossiers DS | 8 |

### Répartition des validations AMO

- `en_attente` : 11 demandes
- `logement_eligible` : 19 dossiers suivis
- `logement_non_eligible` : 6 refus
- `accompagnement_refuse` : 4 refus

### Répartition des prospects (sans AMO)

- **Récents** (< 7 jours) : 10 prospects
- **Moyens** (7-30 jours) : 10 prospects
- **Anciens** (> 30 jours) : 10 prospects
- Tous à l'étape `choix_amo` (visibles par les agents Allers-Vers)

## Nettoyage

Pour supprimer les données de test, exécuter le nettoyage dans `00-init.sql`.

## Identifiants

Les UUID utilisent des patterns reconnaissables :
- Users (AMO) : `11111111-1111-1111-1111-111111111101` à `140`
- Users (Prospects) : `11111111-1111-1111-1111-111111111141` à `170`
- Parcours (AMO) : `22222222-2222-2222-2222-2222222222XX`
- Parcours (Prospects) : `55555555-5555-5555-5555-5555555555XX`
- Validations : `33333333-3333-3333-3333-3333333333XX`
- Dossiers DS : `44444444-4444-4444-4444-4444444444XX`

## Cas d'usage

### Tester l'espace Allers-Vers

1. Créer un agent avec le rôle `ALLERS_VERS` ou `AMO_ET_ALLERS_VERS`
2. Lui assigner un territoire Allers-Vers couvrant le département 36 (Indre)
3. Se connecter avec cet agent
4. Accéder à `/espace-agent/prospects`
5. Voir la liste des 30 prospects sans AMO

### Filtrer les prospects

Les prospects sont répartis par ancienneté pour tester les filtres :
- Prospects récents (dernière action < 7 jours) : IDs `55555555-5555-5555-5555-555555555501` à `510`
- Prospects moyens (7-30 jours) : IDs `55555555-5555-5555-5555-555555555511` à `520`
- Prospects anciens (> 30 jours) : IDs `55555555-5555-5555-5555-555555555521` à `530`
