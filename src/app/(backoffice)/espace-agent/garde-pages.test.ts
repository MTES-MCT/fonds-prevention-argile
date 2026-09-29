import { describe, it, expect } from "vitest";
import { relative } from "node:path";
import { fonctionsExportees, listerFichiers } from "@/shared/testing/server-exports";

const RACINE = __dirname;

// Pages sans aucun rendu ni donnée : elles ne font que rediriger.
const EXEMPTEES = new Set(["prospects/page.tsx"]);

const GARDE = /^(const \w+ = )?await exigerAccesEspaceAgent\(\);$/;

// Next rend layout, page et generateMetadata séparément : chacun doit se garder, le layout ne protège rien.
describe("Espace agent — chaque rendu de page porte sa propre garde d'accès", () => {
  const rendus = listerFichiers(RACINE, (chemin) => chemin.endsWith("/page.tsx"))
    .filter((chemin) => !EXEMPTEES.has(relative(RACINE, chemin)))
    .flatMap((chemin) =>
      fonctionsExportees(chemin)
        .filter((fn) => fn.nom === "default" || fn.nom === "generateMetadata")
        .map((fn) => ({ ...fn, nom: `${relative(RACINE, chemin)} › ${fn.nom}` }))
    );

  it("recense les pages et leurs métadonnées", () => {
    expect(rendus.filter((r) => r.nom.endsWith("› default")).length).toBeGreaterThan(5);
    expect(rendus.filter((r) => r.nom.endsWith("› generateMetadata")).length).toBeGreaterThan(0);
  });

  it.each(rendus)("$nom commence par exigerAccesEspaceAgent()", ({ instructions }) => {
    expect(instructions[0]).toMatch(GARDE);
  });
});
