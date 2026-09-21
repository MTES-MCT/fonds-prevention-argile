import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GererDossierMenu } from "./GererDossierMenu";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

// Les modales tirent des services serveur (client DN, env) que Next transforme au build mais
// que vitest charge pour de bon : on ne teste ici que le menu, pas leur contenu.
vi.mock("../../../shared/components/ArchiveModal", () => ({ ArchiveModal: () => null }));
vi.mock("../../../shared/components/UnarchiveModal", () => ({ UnarchiveModal: () => null }));
vi.mock("../../../shared/components/RattacherAmoModal", () => ({ RattacherAmoModal: () => null }));
vi.mock("../../../shared/components/ArretAccompagnementModal", () => ({ ArretAccompagnementModal: () => null }));
vi.mock("../../../shared/components/RattacherDossierDnModal", () => ({ RattacherDossierDnModal: () => null }));
vi.mock("../../../shared/components/ReinitialiserDossierDnModal", () => ({ ReinitialiserDossierDnModal: () => null }));

const BASE = {
  parcoursId: "11111111-1111-1111-1111-111111111111",
  demandeurNom: "Georges Abitbol",
  peutArreterAccompagnement: false,
  peutAgirSurDossierDn: false,
  peutReinitialiserDn: false,
  stepCourante: Step.ELIGIBILITE,
  estArchive: false,
  rattachementAmo: null,
};

async function ouvrirMenu() {
  await userEvent.click(screen.getByRole("button", { name: /Gérer/ }));
}

describe("GererDossierMenu — rattachement d'une AMO", () => {
  it("n'offre rien quand le dossier n'est pas à rattacher", async () => {
    render(<GererDossierMenu {...BASE} />);
    await ouvrirMenu();

    expect(screen.queryByText("Rattacher une AMO")).not.toBeInTheDocument();
    expect(screen.getByText("Archiver")).toBeInTheDocument();
  });

  it("propose le rattachement quand la page l'a autorisé", async () => {
    render(<GererDossierMenu {...BASE} rattachementAmo={{ amoNom: "Soliha 36", origine: "audit" }} />);
    await ouvrirMenu();

    expect(screen.getByText("Rattacher une AMO")).toBeInTheDocument();
  });

  it("bascule « Archiver » en « Désarchiver » sur un dossier archivé", async () => {
    render(<GererDossierMenu {...BASE} estArchive />);
    await ouvrirMenu();

    expect(screen.getByText("Désarchiver")).toBeInTheDocument();
    expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
  });
});
