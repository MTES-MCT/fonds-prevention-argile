import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fonctionsExportees, listerFichiersServer } from "./server-exports";

let dossier: string;

function ecrire(nom: string, source: string): string {
  const chemin = join(dossier, nom);
  writeFileSync(chemin, source);
  return chemin;
}

beforeAll(() => {
  dossier = mkdtempSync(join(tmpdir(), "server-exports-"));
});

afterAll(() => {
  rmSync(dossier, { recursive: true, force: true });
});

// Chaque cas est un trou relevé en revue sur l'ancienne extraction par regex.
describe("server-exports", () => {
  it("reconnaît la directive précédée d'un commentaire", () => {
    ecrire("commente.ts", '// en-tête\n/* bloc */\n"use server";\nexport async function a() {}\n');
    ecrire("sans-directive.ts", "export async function b() {}\n");

    expect(listerFichiersServer(dossier).map((c) => c.split("/").pop())).toEqual(["commente.ts"]);
  });

  it("recense une action exportée en fonction fléchée", () => {
    const chemin = ecrire(
      "fleche.ts",
      '"use server";\nexport const lireDossier = async (id: string) => {\n  return id;\n};\n'
    );

    expect(fonctionsExportees(chemin)).toEqual([
      expect.objectContaining({ nom: "lireDossier", instructions: ["return id;"] }),
    ]);
  });

  it("recense une fléchée à expression et un `export { x }` local", () => {
    const chemin = ecrire(
      "local.ts",
      '"use server";\nconst lire = async () => charger();\nexport { lire as lireTout };\n'
    );

    expect(fonctionsExportees(chemin)).toEqual([expect.objectContaining({ nom: "lire", instructions: ["charger()"] })]);
  });

  it("déplie un try de tête pour exposer la première vraie instruction", () => {
    const chemin = ecrire(
      "try.ts",
      '"use server";\nexport async function a() {\n  try {\n    const r = await garde();\n    if (r) return r;\n  } catch {}\n}\n'
    );

    expect(fonctionsExportees(chemin)[0].instructions).toEqual(["const r = await garde();", "if (r) return r;"]);
  });

  it("signale une réexportation, dont le corps est illisible ici", () => {
    const chemin = ecrire("reexport.ts", '"use server";\nexport { lire } from "./ailleurs";\n');

    expect(fonctionsExportees(chemin)).toEqual([{ nom: "lire (réexportée)", instructions: [], corps: "" }]);
  });
});
