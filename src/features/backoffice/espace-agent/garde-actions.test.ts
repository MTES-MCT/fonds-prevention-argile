import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = __dirname;
const GARDES = /await (refusAccesEspaceAgent|resolveEspaceAgentAccess)\(\)/;

function listerFichiersServer(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return listerFichiersServer(chemin);
    if (!nom.endsWith(".ts") || nom.endsWith(".test.ts")) return [];
    return readFileSync(chemin, "utf8").startsWith('"use server"') ? [chemin] : [];
  });
}

// Première instruction du corps, try compris : la garde doit précéder toute lecture de données.
function premiereInstruction(source: string, debutSignature: number): string {
  const lignes = source.slice(debutSignature).split("\n");
  const finSignature = lignes.findIndex((ligne) => !ligne.startsWith(" ") && ligne.endsWith("{"));
  const corps = lignes.slice(finSignature + 1).filter((ligne) => ligne.trim() !== "" && ligne.trim() !== "try {");
  return corps[0] ?? "";
}

// Chaque export d'un fichier "use server" est un endpoint POST, joignable sans passer par une page.
describe("Espace agent — chaque server action applique le verdict d'accès en premier", () => {
  const actions = listerFichiersServer(RACINE).flatMap((chemin) => {
    const source = readFileSync(chemin, "utf8");
    return [...source.matchAll(/^export async function (\w+)/gm)].map((m) => ({
      nom: `${relative(RACINE, chemin)} › ${m[1]}`,
      premiere: premiereInstruction(source, m.index ?? 0),
    }));
  });

  it("recense les actions", () => {
    expect(actions.length).toBeGreaterThan(15);
  });

  it.each(actions)("$nom", ({ premiere }) => {
    expect(premiere).toMatch(GARDES);
  });
});
