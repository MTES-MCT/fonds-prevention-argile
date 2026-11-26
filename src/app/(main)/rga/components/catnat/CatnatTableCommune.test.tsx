import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { LigneHistoriqueCatnat } from "@/features/seo/catnat/domain";
import { CatnatTableCommune } from "./CatnatTableCommune";

const reconnue = (champs: Partial<LigneHistoriqueCatnat> = {}): LigneHistoriqueCatnat => ({
  decision: "reconnue",
  codeNor: "INTE2014522A",
  dateDebut: "2019-07-01",
  dateFin: "2019-09-30",
  datePublicationJo: "2020-07-10",
  motif: null,
  ...champs,
});

const nonReconnue: LigneHistoriqueCatnat = {
  decision: "non_reconnue",
  codeNor: null,
  dateDebut: "2025-01-01",
  dateFin: "2025-12-31",
  datePublicationJo: "2026-04-14",
  motif: "critère météorologique non satisfait",
};

const afficher = (lignes: LigneHistoriqueCatnat[]) =>
  render(<CatnatTableCommune lignes={lignes} nomCommune="Châteauroux" codeDepartement="36" />);

const lignesDuTableau = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

describe("CatnatTableCommune", () => {
  it("n'affiche rien sans historique", () => {
    const { container } = afficher([]);

    expect(container).toBeEmptyDOMElement();
  });

  it("distingue chaque ligne par sa décision, avec le motif du refus", () => {
    afficher([nonReconnue, reconnue()]);

    const [refus, reconnaissance] = lignesDuTableau();
    expect(within(refus).getByText("Non reconnue")).toBeInTheDocument();
    expect(within(refus).getByText("Motif : critère météorologique non satisfait")).toBeInTheDocument();
    expect(within(refus).getByText("01/01/2025 au 31/12/2025")).toBeInTheDocument();
    expect(within(refus).getByLabelText("Non disponible")).toBeInTheDocument();

    expect(within(reconnaissance).getByText("Reconnue")).toBeInTheDocument();
    expect(within(reconnaissance).getByText("INTE2014522A")).toBeInTheDocument();
    expect(within(reconnaissance).getByText("10/07/2020")).toBeInTheDocument();
  });

  it("ne compte que les reconnaissances dans le bandeau, les refus à part", () => {
    afficher([nonReconnue, reconnue(), reconnue({ codeNor: "INTE1917051A", dateDebut: "2018-07-01" })]);

    expect(screen.getByText("2 sécheresses classées en catastrophe naturelle dans ma commune")).toBeInTheDocument();
    expect(screen.getByText("1 demande de reconnaissance non accordée depuis juillet 2025")).toBeInTheDocument();
  });

  it("explique les deux décisions dès qu'une demande n'a pas été reconnue", () => {
    afficher([nonReconnue, reconnue()]);

    expect(screen.getByText(/ne l'a pas\s+obtenue/)).toBeInTheDocument();
    expect(screen.getByText(/Les demandes non reconnues sont affichées depuis juillet 2025/)).toBeInTheDocument();
  });

  it("commune sans refus : ni légende ni mention de période", () => {
    afficher([reconnue()]);

    expect(screen.getByText("1 sécheresse classée en catastrophe naturelle dans ma commune")).toBeInTheDocument();
    expect(screen.queryByText(/demande/)).not.toBeInTheDocument();
    expect(screen.queryByText("Non reconnue")).not.toBeInTheDocument();
  });

  it("commune sans aucune reconnaissance : le bandeau annonce les refus", () => {
    afficher([nonReconnue]);

    expect(screen.getByText("1 demande de reconnaissance non accordée depuis juillet 2025")).toBeInTheDocument();
    expect(screen.queryByText(/classée/)).not.toBeInTheDocument();
  });
});
