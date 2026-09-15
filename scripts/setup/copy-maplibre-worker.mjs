// maplibre 6 est ESM-only et ne bundle plus son worker : il le resout via import.meta.url,
// qui pointe le chunk webpack sous Next (404 HTML). On le sert donc depuis public/.
// Node pur et sans dependance : ce script tourne au postinstall, y compris sur Scalingo.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Le worker importe son chunk partage en relatif : les deux doivent atterrir cote a cote.
const FICHIERS = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const dist = dirname(createRequire(import.meta.url).resolve("maplibre-gl/dist/maplibre-gl.mjs"));
const destination = join(process.cwd(), "public");

await mkdir(destination, { recursive: true });
await Promise.all(FICHIERS.map((f) => copyFile(join(dist, f), join(destination, f))));

console.log(`[maplibre] worker copie dans public/ : ${FICHIERS.join(", ")}`);
