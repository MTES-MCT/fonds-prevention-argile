import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackofficeNavigation } from "./BackofficeNavigation";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import * as authHooks from "@/features/auth/hooks";
import { usePathname } from "next/navigation";

vi.mock("@/features/auth/hooks", () => ({
  useAgentRole: vi.fn(),
  useCanAccessAdministration: vi.fn(),
  useCanAccessEspaceAgent: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
// Le badge de comptage déclenche une server action au montage : on la neutralise.
vi.mock("@/features/backoffice/espace-agent/dossiers/actions", () => ({
  getNombreDossiersAction: vi.fn().mockResolvedValue(0),
}));

function setup(opts: { role: UserRole | null; admin: boolean; agent: boolean; path?: string }) {
  vi.mocked(authHooks.useAgentRole).mockReturnValue(opts.role as never);
  vi.mocked(authHooks.useCanAccessAdministration).mockReturnValue(opts.admin);
  vi.mocked(authHooks.useCanAccessEspaceAgent).mockReturnValue(opts.agent);
  vi.mocked(usePathname).mockReturnValue(opts.path ?? "/administration");
}

describe("BackofficeNavigation — matrice d'affichage par rôle (ADR-0015)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("garde de chemin : rien hors backoffice, même avec accès (Header partagé avec le site public)", () => {
    setup({ role: UserRole.SUPER_ADMINISTRATEUR, admin: true, agent: true, path: "/" });
    const { container } = render(<BackofficeNavigation />);
    expect(container).toBeEmptyDOMElement();
  });

  it("SUPER_ADMINISTRATEUR : pilotage complet + Dossiers et Statistiques", () => {
    setup({ role: UserRole.SUPER_ADMINISTRATEUR, admin: true, agent: true });
    render(<BackofficeNavigation />);
    // Rangée pilotage (onglets super-admin inclus)
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics DN")).toBeInTheDocument();
    // Rangée dossiers
    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(screen.getByText("Statistiques")).toBeInTheDocument();
  });

  it("ADMINISTRATEUR : pilotage restreint, pas d'onglets super-admin, pas de Dossiers", () => {
    setup({ role: UserRole.ADMINISTRATEUR, admin: true, agent: false });
    render(<BackofficeNavigation />);
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("AMO")).toBeInTheDocument();
    expect(screen.queryByText("Agents")).not.toBeInTheDocument();
    expect(screen.queryByText("Diagnostics DN")).not.toBeInTheDocument();
    expect(screen.queryByText("Dossiers")).not.toBeInTheDocument();
  });

  it("ANALYSTE national : pilotage minimal, AUCUN Dossiers", () => {
    setup({ role: UserRole.ANALYSTE, admin: true, agent: false });
    render(<BackofficeNavigation />);
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("Demandeurs")).toBeInTheDocument();
    expect(screen.queryByText("AMO")).not.toBeInTheDocument();
    expect(screen.queryByText("Dossiers")).not.toBeInTheDocument();
  });

  it("ANALYSTE départemental : pilotage + Dossiers, mais PAS Statistiques", () => {
    setup({ role: UserRole.ANALYSTE, admin: true, agent: true });
    render(<BackofficeNavigation />);
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(screen.queryByText("Statistiques")).not.toBeInTheDocument();
  });

  it("AMO : pas de pilotage, Dossiers + Statistiques", () => {
    setup({ role: UserRole.AMO, admin: false, agent: true, path: "/espace-agent/dossiers" });
    render(<BackofficeNavigation />);
    expect(screen.queryByText("Tableau de bord")).not.toBeInTheDocument();
    expect(screen.getByText("Dossiers")).toBeInTheDocument();
    expect(screen.getByText("Statistiques")).toBeInTheDocument();
  });

  it("sans rôle : rien", () => {
    setup({ role: null, admin: false, agent: false });
    const { container } = render(<BackofficeNavigation />);
    expect(container).toBeEmptyDOMElement();
  });
});
