# Import — données de référence externes

Scripts qui ingèrent des **données de référence** (RGA, catastrophes naturelles, etc.) depuis des sources externes. Ces données sont volumineuses, changent rarement, et ne sont pas auto-générées par `seed:staging`.

## Sources

| Source | Script | Doc dédiée | Commande |
|---|---|---|---|
| Aléas RGA 2025 (shapefile MTE) | [`rga-zones/import-rga-zones.ts`](./rga-zones/README.md) | [`rga-zones/README.md`](./rga-zones/README.md) + [`rga-zones/ARCHITECTURE.md`](./rga-zones/ARCHITECTURE.md) | `pnpm rga:import <shapefile.shp>` |
| Catastrophes naturelles (API Georisques) | `src/features/seo/catnat/scripts/import-catnat.ts` (lié à la feature SEO) | — | `pnpm seo:import-catnat` |

## RGA Zones

~121 000 polygones, ~2 min d'import en local. Nécessite **PostGIS** activé sur la BDD + **`ogr2ogr`** installé sur la machine (`brew install gdal` sur macOS, `apt install gdal-bin` sur Ubuntu).

Workflow Scalingo (prod / staging) plus complexe car le shapefile pèse trop pour être pushé directement : import local → simplification `ST_Simplify(0.0001)` → `pg_dump` → `db-tunnel` → restore via `psql`. Détails dans [`rga-zones/README.md`](./rga-zones/README.md).

## Catnat (API Georisques)

`pnpm seo:import-catnat` — appel API Georisques pour récupérer les arrêtés Cat-Nat des 20 dernières années par commune. Pas de dépendance système particulière. Logique dans `src/features/seo/catnat/` parce que tightly coupled avec la feature SEO (pages par commune).

Variable d'env optionnelle : `DEBUG_SEO=true` pour logs verbeux.

## Fréquence d'exécution

| Source | Fréquence recommandée |
|---|---|
| RGA Zones | **À chaque nouvel arrêté** (rare, ~1×/an) |
| Catnat | **Mensuel** ou **trimestriel** — les nouveaux arrêtés tombent au fil de l'eau |
