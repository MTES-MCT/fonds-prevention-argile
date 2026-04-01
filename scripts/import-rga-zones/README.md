# Import des zones RGA (PostGIS)

Import des polygones d'alea retrait-gonflement des argiles dans PostGIS pour requete spatiale.

Source : [Georisques - Carte d'exposition RGA 2026](https://www.georisques.gouv.fr/donnees/bases-de-donnees/retrait-gonflement-des-argiles-version-2026)

Le shapefile Georisques utilise un champ `niveau` numerique (1=Faible, 2=Moyen, 3=Fort).
Le script d'import convertit automatiquement en texte (`faible`, `moyen`, `fort`) dans la colonne `alea`.

## Prerequis

- `ogr2ogr` installe localement (`brew install gdal` sur macOS, `apt install gdal-bin` sur Linux)
- Le shapefile telecharge et dezippe

```bash
# Telecharger le shapefile national
curl -o /tmp/AleaRG_2025_Fxx_L93.zip https://files.georisques.fr/argiles/2025/AleaRG_2025_Fxx_L93.zip
unzip /tmp/AleaRG_2025_Fxx_L93.zip -d /tmp/rga-2025/
```

## Import en local

```bash
# Demarrer PostgreSQL PostGIS + appliquer les migrations
pnpm db:start
pnpm db:migrate

# Importer le shapefile
pnpm rga:import /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp

# Tester
curl "http://localhost:3000/api/rga/alea?lat=44.5&lon=0.5"
```

## Import sur Scalingo (staging / production)

### Option A : depuis ta machine via db-tunnel

Ouvre un tunnel vers la base Scalingo et lance `ogr2ogr` en local.

```bash
# 1. Ouvrir le tunnel (reste ouvert en arriere-plan)
scalingo -a <app-name> db-tunnel SCALINGO_POSTGRESQL_URL -p 10000 &

# 2. Recuperer les credentials
scalingo -a <app-name> env | grep SCALINGO_POSTGRESQL_URL
# postgres://user:password@host:port/dbname

# 3. Activer PostGIS + creer la table (si pas encore fait via migration)
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 4. Vider les tables + importer dans une table temporaire
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> -c "DROP TABLE IF EXISTS rga_zones_import; TRUNCATE TABLE rga_zones RESTART IDENTITY;"

ogr2ogr -f PostgreSQL \
  "PG:host=localhost port=10000 dbname=<dbname> user=<user> password=<password>" \
  /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp \
  -nln rga_zones_import -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom -overwrite -progress

# 5. Mapper niveau (1/2/3) -> alea (faible/moyen/fort) + nettoyer
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> <<'SQL'
INSERT INTO rga_zones (alea, geom)
SELECT CASE niveau WHEN 3 THEN 'fort' WHEN 2 THEN 'moyen' ELSE 'faible' END, geom
FROM rga_zones_import;
DROP TABLE rga_zones_import;
SQL

# 6. Verifier
PGPASSWORD=<password> psql -h localhost -p 10000 -U <user> -d <dbname> -c "SELECT alea, COUNT(*) FROM rga_zones GROUP BY alea;"

# 8. Fermer le tunnel
kill %1
```

### Option B : directement sur le serveur Scalingo (one-off)

Tout se fait sur le serveur, sans tunnel. Necessite le geo-buildpack pour avoir `ogr2ogr` sur le container.

**Configuration unique (une seule fois) :**

```bash
# Ajouter le multi-buildpack
scalingo -a <app-name> env-set BUILDPACK_URL=https://github.com/Scalingo/multi-buildpack.git
```

Creer un fichier `.buildpacks` a la racine du projet :

```
https://github.com/Scalingo/geo-buildpack.git
https://github.com/Scalingo/nodejs-buildpack.git
```

Deployer pour que le geo-buildpack s'installe (un deploy classique suffit).

**Import :**

```bash
# 1. Lancer un one-off avec le fichier zip
scalingo -a <app-name> run --file /tmp/AleaRG_2025_Fxx_L93.zip bash

# 2. Dans le container one-off :
# Le fichier uploade est dans /tmp/uploads/
unzip /tmp/uploads/AleaRG_2025_Fxx_L93.zip -d /tmp/rga/

# 3. Activer PostGIS
psql "$SCALINGO_POSTGRESQL_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 4. Vider les tables + importer dans une table temporaire
psql "$SCALINGO_POSTGRESQL_URL" -c "DROP TABLE IF EXISTS rga_zones_import; TRUNCATE TABLE rga_zones RESTART IDENTITY;"

ogr2ogr -f PostgreSQL \
  "PG:$SCALINGO_POSTGRESQL_URL" \
  /tmp/rga/AleaRG_2025_Fxx_L93.shp \
  -nln rga_zones_import -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom -overwrite -progress

# 5. Mapper niveau (1/2/3) -> alea (faible/moyen/fort) + nettoyer
psql "$SCALINGO_POSTGRESQL_URL" <<'SQL'
INSERT INTO rga_zones (alea, geom)
SELECT CASE niveau WHEN 3 THEN 'fort' WHEN 2 THEN 'moyen' ELSE 'faible' END, geom
FROM rga_zones_import;
DROP TABLE rga_zones_import;
SQL

# 6. Verifier
psql "$SCALINGO_POSTGRESQL_URL" -c "SELECT alea, COUNT(*) FROM rga_zones GROUP BY alea;"

# 7. Quitter le one-off
exit
```

## Verification apres import

L'API `/api/rga/alea` permet de tester :

```bash
# Zone forte (Agen, Lot-et-Garonne)
curl "https://<app-domain>/api/rga/alea?lat=44.2&lon=0.62"
# → {"alea":"fort"}

# Zone moyenne
curl "https://<app-domain>/api/rga/alea?lat=48.8&lon=2.3"
# → {"alea":"moyen"} ou {"alea":null}
```

## Mise a jour de la carte visuelle (PMTiles)

La carte MapLibre affiche les zones d'alea via un fichier PMTiles heberge sur data.gouv.fr. Pour que le visuel corresponde aux donnees PostGIS, il faut regenerer ce fichier a partir du meme shapefile.

Prerequis supplementaire : `tippecanoe` (`brew install tippecanoe`)

```bash
# 1. Convertir le shapefile en GeoJSON (WGS84) avec mapping niveau -> ALEA
#    Le style MapLibre attend une propriete "ALEA" avec "Fort"/"Moyen"/"Faible"
#    Le shapefile a un champ "niveau" numerique (1/2/3)
ogr2ogr -f GeoJSON /tmp/rga-2026.geojson \
  /tmp/rga-2025/AleaRG_2025_Fxx_L93.shp \
  -t_srs EPSG:4326 \
  -sql "SELECT CASE niveau WHEN 3 THEN 'Fort' WHEN 2 THEN 'Moyen' ELSE 'Faible' END AS ALEA, geometry FROM AleaRG_2025_Fxx_L93" \
  -dialect SQLite

# 2. Generer le PMTiles
#    -l rga        : nom du layer (doit rester "rga" pour le style existant)
#    -z12 -Z4      : zoom min 4, zoom max 12
tippecanoe -o /tmp/argile-2026.pmtiles \
  -l rga \
  -z12 -Z4 \
  /tmp/rga-2026.geojson

# 3. Publier sur data.gouv.fr
#    Uploader argile-2026.pmtiles sur le dataset :
#    https://www.data.gouv.fr/datasets/carte-des-risques-retrait-gonflement-des-argiles
#    Recuperer l'URL statique du fichier uploade.

# 4. Mettre a jour l'URL dans le code
#    Fichier : public/map/style-carte-argile.json (ligne 27)
#    Remplacer l'ancienne URL par la nouvelle :
#    "url": "pmtiles://https://static.data.gouv.fr/resources/.../argile-2026.pmtiles"
```

Le style MapLibre (`style-carte-argile.json`) n'a pas besoin d'etre modifie : le layer reste `rga`, la propriete `ALEA` est recree avec les valeurs "Fort", "Moyen", "Faible" par la commande `ogr2ogr` ci-dessus (mapping depuis `niveau` 1/2/3).

## Notes

- Le shapefile est en Lambert 93 (EPSG:2154), `ogr2ogr` le reprojette automatiquement en WGS84 (EPSG:4326)
- Le shapefile utilise un champ `niveau` numerique (1=Faible, 2=Moyen, 3=Fort), converti en texte lors de l'import
- L'index spatial GIST garantit des requetes < 10ms
- Si la table `rga_zones` est vide ou absente, l'API retourne `null` et le fallback BDNB s'applique
