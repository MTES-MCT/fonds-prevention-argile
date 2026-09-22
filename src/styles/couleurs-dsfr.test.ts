import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Une couleur codée en dur ne suit pas le thème : le fond reste blanc quand le texte
// DSFR passe en clair, et le texte devient invisible (constaté sur l'ajout de dossier).
const FAMILLES_INTERDITES = [
  {
    motif: /(?<![-\w])(?:bg|text|border)-(?:white|black)(?![-\w])/g,
    conseil: "utiliser --background-default-grey / --text-title-grey",
  },
  {
    motif: /(?<![-\w])(?:bg|text|border)-(?:gray|slate|zinc|neutral|stone)-\d{2,3}(?![-\w])/g,
    conseil: "utiliser --background-alt-grey / --text-mention-grey / --border-default-grey",
  },
];

function listerComposants(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return listerComposants(chemin);
    return entree.isFile() && chemin.endsWith(".tsx") ? [chemin] : [];
  });
}

function releverInfractions(): string[] {
  return listerComposants("src").flatMap((fichier) =>
    readFileSync(fichier, "utf8")
      .split("\n")
      .flatMap((ligne, index) =>
        FAMILLES_INTERDITES.flatMap((famille) =>
          [...ligne.matchAll(famille.motif)].map(
            (occurrence) => `${fichier}:${index + 1} — « ${occurrence[0]} », ${famille.conseil}`
          )
        )
      )
  );
}

describe("couleurs des composants", () => {
  it("garde le balayage représentatif", () => {
    expect(listerComposants("src").length).toBeGreaterThan(300);
  });

  it("n'utilise aucune couleur Tailwind codée en dur", () => {
    expect(releverInfractions()).toEqual([]);
  });
});
