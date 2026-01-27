# Seed Fake Parcours

Données de test pour l'espace AMO (Accueil, Demandes, Dossiers, Statistiques).

## Configuration

1. Récupérer l'ID de votre entreprise AMO :
   ```sql
   SELECT id, nom FROM entreprises_amo;
   ```

2. Remplacer `XXXXXXXXXXXXXXXXXXX` par cet ID dans les fichiers `03-validations-amo.sql`

## Exécution

Exécuter les scripts **dans l'ordre** :

```bash
psql -f 00-init.sql
psql -f 01-users.sql
psql -f 02-parcours.sql
psql -f 03-validations-amo.sql
psql -f 04-dossiers-ds.sql
psql -f 99-verification.sql
```

Ou via Drizzle Studio, copier-coller chaque script séquentiellement.

## Données créées

| Type | Quantité |
|------|----------|
| Utilisateurs | 40 |
| Parcours | 40 |
| Validations AMO | 30 |
| Dossiers DS | 8 |

### Répartition des validations

- `en_attente` : 11 demandes
- `logement_eligible` : 19 dossiers suivis
- `logement_non_eligible` : 6 refus
- `accompagnement_refuse` : 4 refus

## Nettoyage

Pour supprimer les données de test, exécuter le nettoyage dans `00-init.sql`.

## Identifiants

Les UUID utilisent des patterns reconnaissables :
- Users : `11111111-1111-1111-1111-1111111111XX`
- Parcours : `22222222-2222-2222-2222-2222222222XX`
- Validations : `33333333-3333-3333-3333-3333333333XX`
- Dossiers DS : `44444444-4444-4444-4444-4444444444XX`
