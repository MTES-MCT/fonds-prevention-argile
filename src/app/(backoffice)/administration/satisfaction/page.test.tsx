import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { checkAgentAccess } from "@/features/auth";
import { getSatisfaction } from "@/features/backoffice/administration/satisfaction/services/satisfaction.service";
import { UserRole } from "@/shared/domain/value-objects";
import SatisfactionPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));
vi.mock("@/features/auth", () => ({
  checkAgentAccess: vi.fn(),
  ROUTES: { connexion: { agent: "/connexion/agent" } },
}));
vi.mock("@/shared/components", () => ({ AccesNonAutoriseAdmin: () => <p>Accès non autorisé</p> }));
vi.mock("../shared/components/AdminBreadcrumb", () => ({ AdminBreadcrumb: () => null }));
vi.mock("@/features/backoffice/administration/satisfaction/services/satisfaction.service", () => ({
  getSatisfaction: vi.fn(),
}));

const acces = vi.mocked(checkAgentAccess);
const service = vi.mocked(getSatisfaction);
const connecte = (role: UserRole) => acces.mockResolvedValue({ hasAccess: true, user: { role } } as never);

describe("SatisfactionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.mockResolvedValue({ stats: [], commentaires: null });
  });

  it("renvoie un visiteur non connecté vers la connexion agent", async () => {
    acces.mockResolvedValue({ hasAccess: false, errorCode: "NOT_AUTHENTICATED" } as never);

    await expect(SatisfactionPage()).rejects.toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/connexion/agent");
    expect(service).not.toHaveBeenCalled();
  });

  it("refuse un demandeur sans charger aucun avis", async () => {
    acces.mockResolvedValue({ hasAccess: false, errorCode: "INSUFFICIENT_ROLE" } as never);

    render(await SatisfactionPage());

    expect(screen.getByText("Accès non autorisé")).toBeInTheDocument();
    expect(service).not.toHaveBeenCalled();
  });

  it.each([UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS, UserRole.ANALYSTE])(
    "ne demande pas les commentaires pour le rôle %s",
    async (role) => {
      connecte(role);

      render(await SatisfactionPage());

      expect(service).toHaveBeenCalledWith({ role });
      expect(screen.queryByRole("heading", { name: "Commentaires" })).not.toBeInTheDocument();
    }
  );

  it.each([UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMINISTRATEUR])(
    "montre les commentaires au rôle %s",
    async (role) => {
      connecte(role);
      service.mockResolvedValue({
        stats: [],
        commentaires: [
          { id: "a1", libelle: "Diagnostic", note: 1, commentaire: "Trop long", date: "2026-11-10T09:00:00.000Z" },
        ],
      });

      render(await SatisfactionPage());

      expect(service).toHaveBeenCalledWith({ role });
      expect(screen.getByText("Trop long")).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Très difficile" })).toBeInTheDocument();
    }
  );
});
