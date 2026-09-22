import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Une couleur codée en dur ne suit pas le thème : le fond reste blanc quand le texte
// DSFR passe en clair, et le texte devient invisible (constaté sur l'ajout de dossier).
const CLASSES_INTERDITES = [
  {
    motif: /(?<![-\w])(?:bg|text|border)-(?:white|black)(?![-\w])/g,
    conseil: "utiliser --background-default-grey / --text-title-grey",
  },
  {
    motif: /(?<![-\w])(?:bg|text|border)-(?:gray|slate|zinc|neutral|stone)-\d{2,3}(?![-\w])/g,
    conseil: "utiliser --background-alt-grey / --text-mention-grey / --border-default-grey",
  },
];

// Même piège dans un style inline, que les classes ci-dessus ne couvrent pas. Limité au
// gris neutre (r = v = b) : c'est lui qui rend un texte invisible, pas une teinte de marque.
// La couleur est cherchée n'importe où dans la valeur, pour attraper les raccourcis
// du type `border: "2px solid #ccc"` autant que `color: "#666"`.
const STYLES_INTERDITS = [
  {
    motif:
      /(?:backgroundColor|borderColor|border|background|boxShadow|outline|color)\s*[:=]\s*"[^"]*(?:#(?:([0-9a-fA-F])\1{2}|([0-9a-fA-F]{2})\2{2})|\bwhite\b|\bblack\b)[^"]*"/g,
    conseil: "utiliser var(--background-alt-grey) / var(--text-mention-grey) / var(--border-default-grey)",
  },
];

// Surfaces qui ne suivent délibérément pas le thème : le texte y repose sur une couleur
// fixe (aléa RGA, tuile de carte, palette de graphique) ou sort du navigateur.
const SURFACES_NON_THEMEES = [
  "src/shared/email/", // clients mail : aucune variable CSS
  "/pdf/", // react-pdf : aucune variable CSS
  "RgaMap.tsx", // superposition sur les tuiles de carte
  "RgaMapLegend.tsx",
  "ImpactBadge.tsx", // texte sur une couleur d'aléa
  "AleaBadgeDisplay.tsx",
  "NombreDemandesParEtape.tsx", // palette de graphique
];

function listerComposants(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return listerComposants(chemin);
    return entree.isFile() && chemin.endsWith(".tsx") ? [chemin] : [];
  });
}

function releverInfractions(): string[] {
  return listerComposants("src").flatMap((fichier) => {
    const themee = !SURFACES_NON_THEMEES.some((exception) => fichier.includes(exception));
    const familles = themee ? [...CLASSES_INTERDITES, ...STYLES_INTERDITS] : CLASSES_INTERDITES;

    return readFileSync(fichier, "utf8")
      .split("\n")
      .flatMap((ligne, index) =>
        familles.flatMap((famille) =>
          [...ligne.matchAll(famille.motif)].map(
            (occurrence) => `${fichier}:${index + 1} — « ${occurrence[0]} », ${famille.conseil}`
          )
        )
      );
  });
}

describe("couleurs des composants", () => {
  it("garde le balayage représentatif", () => {
    expect(listerComposants("src").length).toBeGreaterThan(300);
  });

  it("n'utilise aucune couleur codée en dur", () => {
    expect(releverInfractions()).toEqual([]);
  });
});
