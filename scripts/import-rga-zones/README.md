# Import des zones RGA (PostGIS)

Import des polygones d'alea retrait-gonflement des argiles dans PostGIS pour requete spatiale.

Source : [Georisques - Carte d'exposition RGA 2026](https://www.georisques.gouv.fr/donnees/bases-de-donnees/retrait-gonflement-des-argiles-version-2026)

Le shapefile Georisques utilise un champ `niveau` numerique (1=Faible, 2=Moyen, 3=Fort).
Le script d'import convertit automatiquement en texte (`faible`, `moyen`, `fort`) dans la colonne `alea`.

## Prerequis

- `ogr2ogr` installe localement (`brew install gdal` sur macOS, `apt install gdal-bin` sur Linux)
- `psql` installe localement (`brew install libpq` sur macOS)
- `tippecanoe` pour la generation PMTiles (`brew install tippecanoe` sur macOS)
- Le shapefile telecharge et dezippe

```bash
# Telecharger le shapefile national
curl -o /tmp/AleaRG_2025_Fxx_L93.zip https://files.georisques.fr/argiles/2025/AleaRG_2025_Fxx_L93.zip
unzip /tmp/AleaRG_2025_Fxx_L93.zip -d /tmp/rga-2025/

# Verifier que le shapefile est bien present
ls /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp
```

## Import en local

```bash
# Demarrer PostgreSQL PostGIS + appliquer les migrations
pnpm db:start
pnpm db:migrate

# Importer le shapefile (121k polygones, ~2 min)
pnpm rga:import /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp

# Tester l'API (demarrer le serveur avant avec pnpm start:dev)
curl "http://localhost:3000/api/rga/alea?lat=44.2&lon=0.62"
# -> {"alea":"moyen"}
```

## Import sur Scalingo (staging / production)

Les geometries MultiPolygon RGA sont volumineuses (~430 Mo en base). Un import direct
via `ogr2ogr` sur Scalingo echoue car PostgreSQL genere des WAL (Write-Ahead Logs)
qui, combines aux donnees, depassent le quota disque (10-20 Go selon le plan).

La methode fiable : importer en local, simplifier les geometries (~160 Mo),
exporter en SQL et restaurer via db-tunnel.

### Etape 1 : Importer en local

Si ce n'est pas deja fait :

```bash
pnpm db:start && pnpm db:migrate
pnpm rga:import /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp
```

### Etape 2 : Simplifier les geometries

La simplification (`ST_Simplify` avec tolerance 0.0001 ~ 10m) reduit la taille de 430 Mo a 162 Mo.
`COALESCE` preserve la geometrie originale pour les micro-zones que la simplification ferait disparaitre.
Les 121 399 polygones sont conserves, sans perte.

```bash
PGPASSWORD=fonds_argile_password psql -h localhost -p 5433 -U fonds_argile_user -d fonds_argile -c "
DROP TABLE IF EXISTS rga_zones_light;
CREATE TABLE rga_zones_light AS
SELECT id, alea, COALESCE(ST_Simplify(geom, 0.0001), geom) AS geom FROM rga_zones;
"
```

Verifier :

```bash
PGPASSWORD=fonds_argile_password psql -h localhost -p 5433 -U fonds_argile_user -d fonds_argile -c "
SELECT pg_size_pretty(pg_total_relation_size('rga_zones_light')), (SELECT COUNT(*) FROM rga_zones_light) as total;
"
# -> 162 MB | 121399
```

### Etape 3 : Exporter en SQL

```bash
PGPASSWORD=fonds_argile_password pg_dump -h localhost -p 5433 -U fonds_argile_user -d fonds_argile -t rga_zones_light --no-owner --no-acl --data-only -f /tmp/rga_zones_light.sql

# Corriger les incompatibilites de version PostgreSQL (PG17 local vs PG16 Scalingo)
sed -i '' '/transaction_timeout/d' /tmp/rga_zones_light.sql

# Renommer la table dans le dump pour cibler rga_zones
sed -i '' 's/rga_zones_light/rga_zones/g' /tmp/rga_zones_light.sql
```

### Etape 4 : Configurer la cle SSH (une seule fois)

```bash
# Verifier si une cle existe
ls ~/.ssh/id_ed25519.pub

# Si non, en generer une
ssh-keygen -t ed25519 -C "ton-email@beta.gouv.fr"

# Ajouter a Scalingo
scalingo keys-add "Mon Mac" ~/.ssh/id_ed25519.pub
```

### Etape 5 : Ouvrir le db-tunnel

Dans un terminal dedie (reste ouvert pendant l'import) :

```bash
scalingo -a <app-name> -region osc-fr1 db-tunnel SCALINGO_POSTGRESQL_URL -p 10000 -i ~/.ssh/id_ed25519
```

Attendre le message :

```
Building tunnel to ...
You can access your database on:
127.0.0.1:10000
```

### Etape 6 : Recuperer les credentials

```bash
scalingo -a <app-name> -region osc-fr1 env | grep SCALINGO_POSTGRESQL_URL
# -> postgres://USER:PASSWORD@host:port/DBNAME
# Noter USER, PASSWORD et DBNAME
```

### Etape 7 : Importer sur Scalingo

Dans un autre terminal :

```bash
# Vider la table
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> -c "TRUNCATE TABLE rga_zones RESTART IDENTITY;"

# Importer le dump SQL
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> -f /tmp/rga_zones_light.sql
# Attendre "COPY 121399"
```

### Etape 8 : Verifier

```bash
# Compter par alea
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> -c "SELECT alea, COUNT(*) FROM rga_zones GROUP BY alea;"
# -> fort: 22269, moyen: 64039, faible: 35091

# Tester l'API
curl "https://staging.fonds-prevention-argile.beta.gouv.fr/api/rga/alea?lat=44.2&lon=0.62"
# -> {"alea":"moyen"}

curl "https://staging.fonds-prevention-argile.beta.gouv.fr/api/rga/alea?lat=48.86&lon=2.35"
# -> {"alea":null}  (Paris, hors zones RGA)
```

### Etape 9 : Fermer le tunnel

Ctrl+C dans le terminal du tunnel.

## Mise a jour de la carte visuelle (PMTiles)

La carte MapLibre affiche les zones d'alea via un fichier PMTiles heberge sur data.gouv.fr.
Pour que le visuel corresponde aux donnees PostGIS, il faut regenerer ce fichier a partir du meme shapefile.

```bash
# 1. Convertir le shapefile en GeoJSON (WGS84) avec mapping niveau -> ALEA
#    Le style MapLibre attend une propriete "ALEA" avec "Fort"/"Moyen"/"Faible"
ogr2ogr -f GeoJSON /tmp/rga-2026.geojson \
  /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp \
  -t_srs EPSG:4326 \
  -sql "SELECT CASE niveau WHEN 3 THEN 'Fort' WHEN 2 THEN 'Moyen' ELSE 'Faible' END AS ALEA, geometry FROM AleaRG_2025_Fxx_L93" \
  -dialect SQLite

# 2. Generer le PMTiles
#    -l rga   : nom du layer (doit rester "rga" pour le style existant)
#    -z12 -Z4 : zoom min 4, zoom max 12
tippecanoe -o /tmp/argile-2026.pmtiles \
  -l rga \
  -z12 -Z4 \
  /tmp/rga-2026.geojson

# 3. Publier sur data.gouv.fr
#    Uploader argile-2026.pmtiles sur le dataset :
#    https://www.data.gouv.fr/datasets/carte-des-risques-retrait-gonflement-des-argiles-2026
#    Recuperer l'URL statique du fichier uploade.

# 4. Mettre a jour l'URL dans le code
#    Fichier : public/map/style-carte-argile.json (ligne 27)
#    Remplacer l'ancienne URL par la nouvelle :
#    "url": "pmtiles://https://static.data.gouv.fr/resources/.../argile-2026.pmtiles"
```

Le style MapLibre (`style-carte-argile.json`) n'a pas besoin d'etre modifie :
le layer reste `rga`, la propriete `ALEA` est recree avec les valeurs "Fort", "Moyen", "Faible"
par la commande `ogr2ogr` ci-dessus (mapping depuis `niveau` 1/2/3).

## Troubleshooting

### "No space left on device" lors de l'import direct (ogr2ogr)

Les geometries MultiPolygon RGA sont volumineuses. Lors d'un COPY, PostgreSQL genere des WAL
proportionnels aux donnees. Avec 430 Mo de geometries, les WAL + donnees depassent facilement
10-20 Go de quota disque Scalingo.

**Solution** : utiliser la methode pg_dump decrite ci-dessus (simplification + export SQL).
Les geometries simplifiees (162 Mo) + WAL tiennent dans le quota.

### Tunnel db-tunnel qui tombe

Si le tunnel se ferme apres une erreur PostgreSQL (PANIC), attendre quelques minutes
que PostgreSQL redemarre, puis relancer :

```bash
scalingo -a <app-name> -region osc-fr1 db-tunnel SCALINGO_POSTGRESQL_URL -p 10000 -i ~/.ssh/id_ed25519
```

Si la DB ne revient pas, un changement de plan (upgrade puis downgrade) force un restart.

### "transaction_timeout" lors du pg_restore

Incompatibilite PostgreSQL 17 (local) vs 16 (Scalingo). Le dump contient un
`SET transaction_timeout = 0` que PG16 ne connait pas.

**Solution** : retirer la ligne du dump avant import :

```bash
sed -i '' '/transaction_timeout/d' /tmp/rga_zones_light.sql
```

### "VACUUM cannot run inside a transaction block"

`psql` met les commandes dans une transaction implicite quand on enchaine avec `;`.
Lancer VACUUM dans une commande separee :

```bash
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> -c "VACUUM;"
```

## Notes techniques

- Le shapefile est en Lambert 93 (EPSG:2154), `ogr2ogr` le reprojette en WGS84 (EPSG:4326)
- Le champ `niveau` numerique (1/2/3) est converti en texte (`faible`/`moyen`/`fort`) lors de l'import
- L'index spatial GIST garantit des requetes < 10ms
- La simplification `ST_Simplify(geom, 0.0001)` reduit la precision d'environ 10m, suffisant pour du point-in-polygon sur des batiments
- `COALESCE(ST_Simplify(...), geom)` preserve les micro-zones que la simplification ferait disparaitre
- Si la table `rga_zones` est vide ou absente, l'API retourne `null` et le fallback BDNB s'applique
