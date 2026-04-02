# RGA 2026 — Comment ca marche

## Vue d'ensemble

```
Shapefile Georisques (source officielle)
        |
        |--- ogr2ogr ---> PostgreSQL/PostGIS (121 399 polygones)
        |                       |
        |                       |--> API /api/rga/alea?lat=X&lon=Y
        |                       |       "Ce batiment est en zone fort/moyen/faible ?"
        |                       |
        |                       |--> bdnb.service.ts
        |                               Remplace la valeur BDNB (pas encore a jour 2026)
        |
        |--- ogr2ogr + tippecanoe ---> PMTiles (fichier statique)
                                          |
                                          |--> data.gouv.fr (hebergement)
                                          |--> MapLibre (affichage carte coloree)
```

## 1. La base de donnees (PostGIS)

La table `rga_zones` contient les 121 399 polygones de zones d'alea argile de toute la France.
Chaque polygone a un niveau : `fort`, `moyen` ou `faible`.

Quand un utilisateur selectionne un batiment, le serveur prend ses coordonnees GPS
et demande a PostGIS : "ce point tombe dans quel polygone ?"

- Si le point est dans une zone -> on retourne l'alea (`fort`, `moyen` ou `faible`)
- Si le point est dans plusieurs zones -> on prend l'alea le plus eleve (principe de precaution)
- Si le point n'est dans aucune zone -> on retourne `null`

Temps de reponse : < 10ms grace a l'index spatial GIST.

## 2. La carte visuelle (PMTiles)

La carte coloree que l'utilisateur voit sur le site est un fichier PMTiles :
des tuiles vectorielles pre-generees, hebergees sur data.gouv.fr.
MapLibre telecharge ces tuiles et colorie les zones en rouge/orange/jaune.

La carte et PostGIS sont **independantes** :
- La carte = ce que l'utilisateur **voit**
- PostGIS = ce que le simulateur **utilise** pour determiner l'alea d'un batiment

Les deux partent du meme shapefile source, donc elles sont coherentes.

## 3. Le lien avec la BDNB

La BDNB (Base de Donnees Nationale des Batiments) fournit les infos d'un batiment :
annee de construction, surface, nombre de niveaux, DPE, adresse, et normalement l'alea argile.

Probleme : la BDNB n'a pas encore integre les donnees RGA 2026.

Solution : on interroge la BDNB et PostGIS **en parallele**, puis on remplace le champ
`aleaArgiles` de la BDNB par le resultat PostGIS quand il est disponible.
Si PostGIS ne repond pas ou retourne `null`, on garde la valeur BDNB (fallback).

## 4. La simplification des geometries

Les polygones bruts de Georisques sont tres detailles (precis au metre).
En base, ca represente 430 Mo. Sur Scalingo, l'import direct fait exploser le disque
a cause des logs de transaction (WAL) de PostgreSQL.

On a simplifie les frontieres entre zones d'environ 10 metres (`ST_Simplify`).
Ca reduit la taille a 162 Mo, sans perdre aucun des 121 399 polygones.

Impact : un batiment situe pile sur la frontiere entre deux zones, a 10m pres,
pourrait theoriquement basculer. En pratique, ca n'a pas d'effet :
on prend toujours l'alea le plus eleve, et la precision est largement
suffisante pour determiner si un batiment est en zone fort, moyen ou faible.

## 5. Les fichiers cles dans le code

| Fichier | Role |
|---------|------|
| `src/app/api/rga/alea/route.ts` | Route API publique `/api/rga/alea?lat=X&lon=Y` |
| `src/shared/services/rga/rga-alea.service.ts` | Valide les coordonnees et appelle le repository |
| `src/shared/database/repositories/rga-zones.repository.ts` | Requete spatiale PostGIS (`ST_Intersects`) |
| `src/shared/services/bdnb/bdnb.service.ts` | Appel BDNB + override avec le resultat PostGIS |
| `scripts/import-rga-zones/import-rga-zones.ts` | Script d'import du shapefile en local |
| `scripts/import-rga-zones/README.md` | Procedures d'import local et Scalingo |
| `public/map/style-carte-argile.json` | Style MapLibre avec URL du PMTiles |
