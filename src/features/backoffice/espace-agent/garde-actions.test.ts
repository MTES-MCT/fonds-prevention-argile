import { describe, it, expect } from "vitest";
import { relative } from "node:path";
import { fonctionsExportees, listerFichiersServer } from "@/shared/testing/server-exports";

const RACINE = __dirname;
const APPEL_GARDE = /^const (\w+) = await (refusAccesEspaceAgent|resolveEspaceAgentAccess)\(\);$/;

// Chaque export d'un fichier "use server" est un endpoint POST, joignable sans passer par une page.
describe("Espace agent — chaque server action applique le verdict d'accès en premier", () => {
  const actions = listerFichiersServer(RACINE).flatMap((chemin) =>
    fonctionsExportees(chemin).map((fn) => ({ ...fn, nom: `${relative(RACINE, chemin)} › ${fn.nom}` }))
  );

  it("recense les actions", () => {
    expect(actions.length).toBeGreaterThan(15);
  });

  // Appeler la garde sans tester son résultat ne refuse rien : l'instruction suivante doit s'en servir.
  it.each(actions)("$nom", ({ instructions }) => {
    const variable = instructions[0]?.match(APPEL_GARDE)?.[1];
    expect(variable, "la première instruction doit être la garde, affectée à une variable").toBeDefined();
    expect(instructions[1]).toMatch(new RegExp(`^if \\(${variable}\\b`));
  });
});
