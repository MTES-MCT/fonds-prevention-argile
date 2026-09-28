import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = __dirname;

// Pages sans aucun rendu ni donnée : elles ne font que rediriger.
const EXEMPTEES = new Set(["prospects/page.tsx"]);

function listerPages(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return listerPages(chemin);
    return nom === "page.tsx" ? [chemin] : [];
  });
}

// Le layout ne protège rien : Next rend la page en parallèle et sérialise son RSC même quand il refuse.
describe("Espace agent — chaque page porte sa propre garde d'accès", () => {
  const pages = listerPages(RACINE).map((chemin) => relative(RACINE, chemin));

  it("recense les pages", () => {
    expect(pages.length).toBeGreaterThan(5);
  });

  it.each(pages.filter((page) => !EXEMPTEES.has(page)))("%s appelle exigerAccesEspaceAgent()", (page) => {
    const source = readFileSync(join(RACINE, page), "utf8");
    expect(source).toMatch(/await exigerAccesEspaceAgent\(\)/);
  });
});
