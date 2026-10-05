import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotationsDnBadges, BilanAnnotationsDnEncart } from "./AnnotationsDn";
import { resumerBilanAnnotationsDn } from "./annotations-dn.format";
import { bilanAnnotationsDnVide } from "@/shared/domain/value-objects/bilan-annotations-dn";

const BILAN = {
  controles: 4,
  ecritures: { avisImpot: 2, typeMenage: 3, tauxSubvention: 3, lienFpa: 0 },
  aJour: 1,
  echecs: 1,
  echecsLienFpa: 0,
  verdicts: { coherent: 1, a_verifier: 1, non_verifiable: 1 },
};

describe("resumerBilanAnnotationsDn", () => {
  it.each([
    [null, "—"],
    [bilanAnnotationsDnVide(), "Aucun contrôle"],
    [BILAN, "4 contrôlés · 2 mis à jour · 1 échec"],
    [
      {
        ...bilanAnnotationsDnVide(),
        ecritures: { ...bilanAnnotationsDnVide().ecritures, lienFpa: 3 },
        echecsLienFpa: 1,
      },
      "Aucun contrôle · 3 liens FPA complétés · 1 échec de lien FPA",
    ],
  ])("%o → %s", (bilan, texte) => {
    expect(resumerBilanAnnotationsDn(bilan)).toBe(texte);
  });
});

describe("BilanAnnotationsDnEncart", () => {
  it("affiche les compteurs du run", () => {
    render(<BilanAnnotationsDnEncart bilan={BILAN} />);

    expect(
      screen.getByText(/Contrôles lancés : 4 · Dossiers mis à jour : 2 · Déjà à jour : 1 · Échecs : 1/)
    ).toBeTruthy();
    expect(screen.getByText(/Avis d'imposition 2 · Tranche de revenus 3 · Taux 3 · Lien FPA 0/)).toBeTruthy();
    expect(screen.getByText(/Cohérent 1 · À vérifier 1 · Non vérifiable 1/)).toBeTruthy();
  });

  it("signale un run antérieur au bilan", () => {
    render(<BilanAnnotationsDnEncart bilan={null} />);

    expect(screen.getByText(/non suivies pour ce run/)).toBeTruthy();
  });

  it("détaille un run où seuls des liens FPA ont été complétés", () => {
    render(
      <BilanAnnotationsDnEncart
        bilan={{ ...bilanAnnotationsDnVide(), ecritures: { ...bilanAnnotationsDnVide().ecritures, lienFpa: 2 } }}
      />
    );

    expect(screen.getByText(/Lien FPA 2/)).toBeTruthy();
  });

  it("dit qu'aucun contrôle n'a tourné", () => {
    render(<BilanAnnotationsDnEncart bilan={bilanAnnotationsDnVide()} />);

    expect(screen.getByText(/Aucun contrôle de l'avis d'imposition/)).toBeTruthy();
  });
});

describe("AnnotationsDnBadges", () => {
  it("nomme les annotations écrites", () => {
    render(<AnnotationsDnBadges entree={{ issue: "ecrite", annotationsEcrites: ["avisImpot", "tauxSubvention"] }} />);

    expect(screen.getByText("Avis d'imposition")).toBeTruthy();
    expect(screen.getByText("Taux")).toBeTruthy();
    expect(screen.queryByText("Tranche de revenus")).toBeNull();
  });

  it.each([
    [{ issue: "inchangee" as const, annotationsEcrites: [] }, "À jour"],
    [{ issue: "echec" as const, annotationsEcrites: [] }, "Échec"],
  ])("affiche l'issue %o", (entree, texte) => {
    render(<AnnotationsDnBadges entree={entree} />);

    expect(screen.getByText(texte)).toBeTruthy();
  });

  it("nomme le lien FPA une seule fois, même complété sur plusieurs dossiers, et son échec", () => {
    render(
      <AnnotationsDnBadges
        entree={{ issue: "inchangee", annotationsEcrites: ["lienFpa", "lienFpa"], echecLienFpa: true }}
      />
    );

    expect(screen.getByText("À jour")).toBeTruthy();
    expect(screen.getAllByText("Lien FPA")).toHaveLength(1);
    expect(screen.getByText("Échec du lien FPA")).toBeTruthy();
  });

  it("affiche un tiret sans contrôle", () => {
    const { container } = render(<AnnotationsDnBadges entree={null} />);

    expect(container.textContent).toBe("-");
  });
});
