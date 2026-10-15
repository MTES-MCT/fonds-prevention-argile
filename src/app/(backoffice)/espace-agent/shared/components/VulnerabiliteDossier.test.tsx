import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { VulnerabiliteDossier } from "./VulnerabiliteDossier";

vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: vi.fn(),
}));
vi.mock("./InfoVulnerabilite", () => ({
  InfoVulnerabilite: ({ action }: { action?: React.ReactNode }) => (
    <div>
      <p>Carte du résultat</p>
      {action}
    </div>
  ),
}));

const RESULTAT = { compte: {}, completedAt: new Date(), reponses: [] } as never;

async function rendre(role: UserRole, vulnerabilite: typeof RESULTAT | null) {
  vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: { role } } as never);
  render(await VulnerabiliteDossier({ id: "val-1", vulnerabilite }));
}

describe("VulnerabiliteDossier", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(true);
  });

  it("propose à l'AMO de faire le test avec le demandeur quand il n'en a pas", async () => {
    await rendre(UserRole.AMO, null);

    expect(screen.getByText(/n'a pas encore fait le test/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Faire le test avec le demandeur" })).toHaveAttribute(
      "href",
      "/espace-agent/vulnerabilite/val-1"
    );
  });

  it("propose de refaire le test quand un résultat existe", async () => {
    await rendre(UserRole.ALLERS_VERS, RESULTAT);

    expect(screen.getByText("Carte du résultat")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Refaire le test avec le demandeur" })).toBeInTheDocument();
  });

  it("n'affiche que le résultat, sans bouton, à un rôle qui ne peut pas agir", async () => {
    await rendre(UserRole.SUPER_ADMINISTRATEUR, RESULTAT);

    expect(screen.getByText("Carte du résultat")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Faire le test|Refaire le test/ })).not.toBeInTheDocument();
  });

  it("n'affiche rien à un rôle qui ne peut pas agir quand il n'y a pas de résultat", async () => {
    await rendre(UserRole.ANALYSTE, null);

    expect(screen.queryByText(/Vulnérabilité au RGA/)).not.toBeInTheDocument();
  });

  it("ne propose pas le test quand la feature est inactive", async () => {
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(false);
    await rendre(UserRole.AMO, null);

    expect(screen.queryByRole("link", { name: /Faire le test/ })).not.toBeInTheDocument();
  });
});
