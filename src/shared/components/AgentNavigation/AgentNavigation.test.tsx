import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentNavigation } from "./AgentNavigation";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import * as authHooks from "@/features/auth/hooks";
import { usePathname } from "next/navigation";

vi.mock("@/features/auth/hooks", () => ({ useAgentRole: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
// Le badge de comptage déclenche une server action au montage : on la neutralise.
vi.mock("@/features/backoffice/espace-agent/dossiers/actions", () => ({
  getNombreDossiersAction: vi.fn().mockResolvedValue(0),
}));

function mockRole(role: UserRole | null) {
  vi.mocked(authHooks.useAgentRole).mockReturnValue(role as never);
}

function mockPath(path: string) {
  vi.mocked(usePathname).mockReturnValue(path);
}

describe("AgentNavigation — visibilité des onglets espace agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPath("/espace-agent/dossiers");
  });

  it("affiche Dossiers mais pas Statistiques pour un ANALYSTE (stats dans /administration)", () => {
    mockRole(UserRole.ANALYSTE);
    render(<AgentNavigation />);
    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(screen.queryByText("Statistiques")).not.toBeInTheDocument();
  });

  it("affiche les onglets pour un AMO (non-régression)", () => {
    mockRole(UserRole.AMO);
    render(<AgentNavigation />);
    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(screen.getByText("Statistiques")).toBeInTheDocument();
  });

  it("n'affiche aucune navigation pour un ADMINISTRATEUR", () => {
    mockRole(UserRole.ADMINISTRATEUR);
    const { container } = render(<AgentNavigation />);
    expect(container).toBeEmptyDOMElement();
  });

  it("n'affiche aucune navigation sans rôle agent", () => {
    mockRole(null);
    const { container } = render(<AgentNavigation />);
    expect(container).toBeEmptyDOMElement();
  });

  it("n'affiche pas la barre hors de l'espace agent, même pour un ANALYSTE (ex. /administration)", () => {
    mockRole(UserRole.ANALYSTE);
    mockPath("/administration");
    const { container } = render(<AgentNavigation />);
    expect(container).toBeEmptyDOMElement();
  });
});
