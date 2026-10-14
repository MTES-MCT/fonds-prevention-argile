import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ResultNonEligible } from "./ResultNonEligible";
import { SimulateurProvider } from "../shared/SimulateurContext";
import { createInitialChecks } from "../../domain/entities/eligibility-result.entity";

const trackEvent = vi.fn();
const vulnerabiliteActive = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/features/auth/client", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/shared/components/Matomo/useMatomo", () => ({ useMatomo: () => ({ trackEvent }) }));
vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: vulnerabiliteActive,
}));

const checksMaison = { ...createInitialChecks(), maison: true, zoneForte: false };
const props = { checks: checksMaison, onRestart: vi.fn(), onBack: vi.fn() };
const CTA = "Tester ma vulnérabilité (5 min)";

describe("ResultNonEligible : proposition du simulateur de vulnérabilité", () => {
  beforeEach(() => {
    vulnerabiliteActive.mockReturnValue(true);
    trackEvent.mockClear();
  });

  it("propose le test pour une maison non éligible, et trace le clic", () => {
    render(<ResultNonEligible {...props} />);

    const lien = screen.getByRole("link", { name: CTA });
    expect(lien).toHaveAttribute("href", "/vulnerabilite-rga");
    fireEvent.click(lien);
    expect(trackEvent).toHaveBeenCalledWith("vulnerabilite_cta_non_eligible");
  });

  it("garde l'écran d'origine quand la feature est inactive", () => {
    vulnerabiliteActive.mockReturnValue(false);
    render(<ResultNonEligible {...props} />);

    expect(screen.queryByRole("link", { name: CTA })).not.toBeInTheDocument();
    expect(screen.getByText("Vous n'êtes pas éligible")).toBeInTheDocument();
  });

  it("ne le propose pas dans l'iframe partenaire", () => {
    render(
      <SimulateurProvider proposerVulnerabilite={false}>
        <ResultNonEligible {...props} />
      </SimulateurProvider>
    );

    expect(screen.queryByRole("link", { name: CTA })).not.toBeInTheDocument();
  });

  it("ne le propose pas pour un appartement", () => {
    render(<ResultNonEligible {...props} checks={{ ...createInitialChecks(), maison: false }} />);

    expect(screen.queryByRole("link", { name: CTA })).not.toBeInTheDocument();
  });
});
