# Scripts de seed

## Seeder la base avec des données de test

```bash
# 1. Nettoyer la base (optionnel)
docker exec -it fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile -c "TRUNCATE TABLE dossiers_demarches_simplifiees, parcours_amo_validations, amo_validation_tokens, parcours_prevention, entreprises_amo_communes, entreprises_amo, users CASCADE;"

# 2. Insérer les données de test
cat seed-stats.sql | docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile
```

## Données créées

- **15 comptes** utilisateurs
- **5 entreprises** AMO
- **10 demandes** AMO (4 en attente)
- **8 dossiers** DS (3 brouillon + 5 envoyés)

## Windows PowerShell

Remplacer `cat` par `Get-Content` :

```powershell
Get-Content seed-stats.sql | docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile
```
