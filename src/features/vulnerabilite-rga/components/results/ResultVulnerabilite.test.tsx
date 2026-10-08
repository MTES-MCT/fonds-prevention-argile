import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ResultVulnerabilite } from "./ResultVulnerabilite";
import { computeResultat } from "../../domain/services/categorisation.service";
import type { PartialVulnerabiliteReponses } from "../../domain/types/vulnerabilite-reponses.types";

// Le bouton PDF tire `@react-pdf/renderer`, dont le moteur de mise en page casse sous jsdom.
vi.mock("next/dynamic", () => ({ default: () => () => null }));
// Sous Vitest, un import de SVG est une chaîne : `next/image` y exige des dimensions.
vi.mock("next/image", () => ({ default: () => null }));

const ADRESSE = { label: "1 rue Test", communeNom: "Testville", coordonnees: null, clefBan: null, rnb: null };

function rendre(answers: PartialVulnerabiliteReponses) {
  return render(<ResultVulnerabilite answers={answers} result={computeResultat(answers)} onRestart={() => {}} />);
}

const ELIGIBLE: PartialVulnerabiliteReponses = {
  adresse: { ...ADRESSE, codeDepartement: "36", aleaRga: "fort" },
  divers: { mitoyennete: "pas_mitoyen" },
};

describe("ResultVulnerabilite — callout de synthèse", () => {
  it("annonce l'aléa et les points, en accent rouge dès qu'un point est critique", () => {
    const { container } = rendre({
      ...ELIGIBLE,
      eaux: { reseaux_enterres: "sous_fondations", gouttieres: "absentes_ou_debordantes" },
      vegetation: { haies: "proches_denses" },
    });

    expect(
      screen.getByText(
        "Votre maison est située en zone d'aléa fort. Nous avons identifié 2 points critiques et 1 point de vigilance."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Points critiques identifiés" })).toBeInTheDocument();
    expect(container.querySelector(".fr-callout--pink-tuile")).not.toBeNull();
  });

  it("reste en accent jaune avec un point critique en zone d'aléa faible", () => {
    const { container } = rendre({
      ...ELIGIBLE,
      adresse: { ...ADRESSE, codeDepartement: "36", aleaRga: "faible" },
      eaux: { reseaux_enterres: "sous_fondations" },
    });

    expect(screen.getByRole("heading", { name: "Points critiques identifiés" })).toBeInTheDocument();
    expect(container.querySelector(".fr-callout--yellow-moutarde")).not.toBeNull();
    expect(container.querySelector(".fr-callout--pink-tuile")).toBeNull();
  });

  it("passe en accent jaune sans point critique mais avec un point de vigilance", () => {
    const { container } = rendre({ ...ELIGIBLE, eaux: { gouttieres: "absentes_ou_debordantes" } });

    expect(screen.getByRole("heading", { name: "Points de vigilance identifiés" })).toBeInTheDocument();
    expect(container.querySelector(".fr-callout--yellow-moutarde")).not.toBeNull();
  });

  it("passe en accent vert sans point critique ni de vigilance", () => {
    const { container } = rendre({ ...ELIGIBLE, eaux: { reseaux_enterres: "eloignes" } });

    expect(screen.getByRole("heading", { name: "Aucun point critique ni de vigilance" })).toBeInTheDocument();
    expect(container.querySelector(".fr-callout--green-emeraude")).not.toBeNull();
  });
});

describe("ResultVulnerabilite — renvoi vers le simulateur d'éligibilité", () => {
  const LIEN = "Vérifier mon éligibilité au Fonds Prévention Argile";

  it("s'affiche quand département, aléa fort et non-mitoyenneté sont réunis", () => {
    rendre(ELIGIBLE);

    expect(screen.getByRole("link", { name: LIEN })).toHaveAttribute("href", "/simulateur");
  });

  it.each([
    ["département non éligible", { ...ELIGIBLE, adresse: { ...ADRESSE, codeDepartement: "75", aleaRga: "fort" } }],
    ["aléa moyen", { ...ELIGIBLE, adresse: { ...ADRESSE, codeDepartement: "36", aleaRga: "moyen" } }],
    ["maison mitoyenne", { ...ELIGIBLE, divers: { mitoyennete: "mitoyen_voisin_travaux_prevention" } }],
  ] as [string, PartialVulnerabiliteReponses][])("est masqué : %s", (_cas, answers) => {
    rendre(answers);

    expect(screen.queryByRole("link", { name: LIEN })).toBeNull();
  });

  it("laisse l'avertissement « pas un diagnostic » visible même sans le renvoi, sans promettre de financement", () => {
    rendre({ ...ELIGIBLE, adresse: { ...ADRESSE, codeDepartement: "75", aleaRga: "fort" } });

    expect(screen.getByText(/pas un diagnostic/)).toBeInTheDocument();
    expect(screen.queryByText(/il peut financer/)).toBeNull();
  });

  it("annonce le financement du diagnostic quand le logement remplit les critères", () => {
    rendre(ELIGIBLE);

    expect(screen.getByText(/il peut financer ce diagnostic/)).toBeInTheDocument();
  });
});

describe("ResultVulnerabilite — sections de fiches", () => {
  it("range les fiches sous critiques, vigilance puis à surveiller, et masque les sections vides", () => {
    rendre({
      ...ELIGIBLE,
      eaux: { pente_terrain: "ne_sais_pas", gouttieres: "absentes_ou_debordantes" },
      vegetation: { vegetation_pied_facade: "presente" },
    });

    const titres = screen.getAllByRole("heading", { level: 2, name: /^Points (critiques|de vigilance|à surveiller)$/ });
    expect(titres.map((t) => t.textContent)).toEqual([
      "Points critiques",
      "Points de vigilance",
      "Points à surveiller",
    ]);

    const critiques = titres[0].closest("section")!;
    expect(within(critiques).getByText("Supprimer la végétation en pied de façade")).toBeInTheDocument();
    expect(within(critiques).queryByText("Entretenir les gouttières et éloigner leur évacuation")).toBeNull();
  });

  it("donne à chaque section son nombre de points et à chaque fiche le badge de sa catégorie", () => {
    rendre({
      ...ELIGIBLE,
      eaux: { gouttieres: "absentes_ou_debordantes", reseaux_enterres: "sous_fondations" },
      vegetation: { vegetation_pied_facade: "presente" },
    });

    const critiques = screen.getByRole("heading", { level: 2, name: "Points critiques" }).closest("section")!;
    expect(within(critiques).getByText("2 points identifiés")).toBeInTheDocument();
    expect(within(critiques).getAllByText("Point critique")).toHaveLength(2);

    const vigilance = screen.getByRole("heading", { level: 2, name: "Points de vigilance" }).closest("section")!;
    expect(within(vigilance).getByText("1 point identifié")).toBeInTheDocument();
    expect(within(vigilance).getByText("Point de vigilance")).toBeInTheDocument();
  });

  it("n'affiche aucune section quand tout est en bonne pratique", () => {
    rendre({ ...ELIGIBLE, eaux: { reseaux_enterres: "eloignes" } });

    expect(screen.queryByRole("heading", { name: /^Points (critiques|de vigilance|à surveiller)$/ })).toBeNull();
    expect(screen.getByText(/Aucun point critique, de vigilance ou à surveiller/)).toBeInTheDocument();
  });

  it("donne une fiche à la source de chaleur contre un mur non isolé", () => {
    rendre({ ...ELIGIBLE, divers: { mitoyennete: "pas_mitoyen", source_chaleur_sous_sol: "oui_mur_non_isole" } });

    const critiques = screen.getByRole("heading", { level: 2, name: "Points critiques" }).closest("section")!;
    expect(
      within(critiques).getByRole("heading", { name: "Limiter la chaleur transmise au sol par le mur du sous-sol" })
    ).toBeInTheDocument();
  });
});
