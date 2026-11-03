import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StructureAdministration } from "@/features/backoffice";
import StructureFusionModal from "./StructureFusionModal";

vi.mock("@/features/backoffice", async () => {
  const domaine = await import("@/features/backoffice/administration/structures/domain/operations-structures");
  return domaine;
});

function structure(
  nom: string,
  habilitations: { amo?: boolean; av?: boolean },
  agents: string[] = []
): StructureAdministration {
  return {
    id: nom,
    nom,
    entrepriseAmo: habilitations.amo ? { id: `amo-${nom}`, nom } : null,
    allersVers: habilitations.av ? { id: `av-${nom}`, nom } : null,
    agents: agents.map((nomComplet, i) => ({ id: `${nom}-${i}`, nomComplet, email: "", desactive: false })),
  };
}

const maisonTranquille = structure("AMO Maison Tranquille", { amo: true }, ["Marie Martin"]);
const adil36 = structure("Adil 36", { av: true }, ["Jean Dupont"]);
const autreAmo = structure("Soliha 36", { amo: true });
const paire = structure("AMO du Berry Profond", { amo: true, av: true });

describe("StructureFusionModal", () => {
  it("ne propose que les structures dont les habilitations complètent la cible", () => {
    render(
      <StructureFusionModal
        modalId="modal"
        cible={maisonTranquille}
        structures={[maisonTranquille, adil36, autreAmo, paire]}
        onConfirm={vi.fn()}
      />
    );

    const options = screen.getAllByRole("option", { hidden: true }).map((option) => option.textContent);
    expect(options).toEqual(["Sélectionner une structure", "Adil 36 (Aller-vers)"]);
  });

  it("annonce les rôles gagnés par les agents des deux structures avant de confirmer", async () => {
    render(
      <StructureFusionModal
        modalId="modal"
        cible={maisonTranquille}
        structures={[maisonTranquille, adil36]}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Fusionner", hidden: true })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Structure à fusionner"), "Adil 36");

    expect(
      screen.getByText("Les agents de « AMO Maison Tranquille » gagnent le rôle Aller-vers : Marie Martin.")
    ).toBeInTheDocument();
    expect(screen.getByText("Les agents de « Adil 36 » gagnent le rôle AMO : Jean Dupont.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fusionner", hidden: true })).toBeEnabled();
  });

  it("explique qu'aucune fusion n'est possible pour une structure qui a déjà les deux habilitations", () => {
    render(
      <StructureFusionModal
        modalId="modal"
        cible={paire}
        structures={[paire, maisonTranquille, adil36]}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/Aucune structure ne peut rejoindre celle-ci/)).toBeInTheDocument();
  });

  it("monte le dialogue avant toute sélection, sans quoi DSFR n'ouvre pas le premier clic", () => {
    render(<StructureFusionModal modalId="modal-fusion" cible={null} structures={[adil36]} onConfirm={vi.fn()} />);

    expect(document.getElementById("modal-fusion")).not.toBeNull();
  });

  it("nomme un agent désactivé, qui recevra ces droits à sa réactivation", async () => {
    const avecDesactive: StructureAdministration = {
      ...adil36,
      agents: [{ id: "x", nomComplet: "Paul Durand", email: "", desactive: true }],
    };
    render(
      <StructureFusionModal
        modalId="modal"
        cible={maisonTranquille}
        structures={[maisonTranquille, avecDesactive]}
        onConfirm={vi.fn()}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText("Structure à fusionner"), "Adil 36");

    expect(
      screen.getByText("Les agents de « Adil 36 » gagnent le rôle AMO : Paul Durand (désactivé, à sa réactivation).")
    ).toBeInTheDocument();
  });

  it("affiche le refus de l'opération dans la modale restée ouverte", () => {
    render(
      <StructureFusionModal
        modalId="modal"
        cible={maisonTranquille}
        structures={[maisonTranquille, adil36]}
        onConfirm={vi.fn()}
        erreur="Les deux structures ont déjà une habilitation AMO"
      />
    );

    expect(screen.getByRole("alert", { hidden: true })).toHaveTextContent(
      "Les deux structures ont déjà une habilitation AMO"
    );
  });
});
