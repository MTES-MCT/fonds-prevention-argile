import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));

import { getCurrentUser } from "@/features/auth/services/user.service";
import { AmoGuard } from "./AmoGuard";

const CONTENU = "Contenu de l'espace agent";

async function rendre(utilisateur: unknown) {
  vi.mocked(getCurrentUser).mockResolvedValue(utilisateur as never);
  render(await AmoGuard({ children: <p>{CONTENU}</p> }));
}

// RBAC-TEST-PLAN § 7 : une AMO sans entreprise n'a aucun périmètre, elle ne doit rien voir de l'espace agent.
describe("AmoGuard", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS])(
    "%s sans entreprise rattachée → écran de blocage, le contenu n'est pas rendu",
    async (role) => {
      await rendre({ role, firstName: "Camille", lastName: "Martin", entrepriseAmoId: null });

      expect(screen.getByText("Configuration de votre compte incomplète")).toBeInTheDocument();
      expect(screen.queryByText(CONTENU)).not.toBeInTheDocument();
    }
  );

  it.each([UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS])("%s avec entreprise → contenu rendu", async (role) => {
    await rendre({ role, entrepriseAmoId: "entreprise-1" });

    expect(screen.getByText(CONTENU)).toBeInTheDocument();
  });

  it.each([UserRole.ALLERS_VERS, UserRole.ANALYSTE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMINISTRATEUR])(
    "%s, qui n'a pas besoin d'entreprise → contenu rendu",
    async (role) => {
      await rendre({ role, entrepriseAmoId: null });

      expect(screen.getByText(CONTENU)).toBeInTheDocument();
    }
  );

  // Le composant ne filtre que le cas AMO : sans session, ce sont les gardes de chaque page qui refusent.
  it("sans session → laisse passer, la garde d'accès est ailleurs", async () => {
    await rendre(null);

    expect(screen.getByText(CONTENU)).toBeInTheDocument();
  });
});
