import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CalloutExpertRga } from "./CalloutExpertRga";
import { VulnerabiliteProvider, type ContexteAgentVulnerabilite } from "../shared/VulnerabiliteContext";

const trackEvent = vi.fn();
vi.mock("@/shared/components/Matomo/useMatomo", () => ({ useMatomo: () => ({ trackEvent }) }));

const CTA = "Vérifier mon éligibilité au Fonds Prévention Argile";
const agent: ContexteAgentVulnerabilite = {
  nomDemandeur: "Camille Martin",
  adresseInitiale: null,
  enregistrer: vi.fn(),
  urlRetour: "/espace-agent/dossiers/1",
};

describe("CalloutExpertRga : renvoi vers le simulateur d'éligibilité", () => {
  beforeEach(() => trackEvent.mockClear());

  it("trace le clic du visiteur", () => {
    render(<CalloutExpertRga eligibleFonds />);

    const lien = screen.getByRole("link", { name: CTA });
    expect(lien).toHaveAttribute("href", "/simulateur");
    fireEvent.click(lien);
    expect(trackEvent).toHaveBeenCalledWith("vulnerabilite_cta_eligibilite");
  });

  it("reste dans l'iframe partenaire", () => {
    render(
      <VulnerabiliteProvider urlEligibilite="/embed-simulateur?partner=maif">
        <CalloutExpertRga eligibleFonds />
      </VulnerabiliteProvider>
    );

    const lien = screen.getByRole("link", { name: CTA });
    expect(lien).toHaveAttribute("href", "/embed-simulateur?partner=maif");
    fireEvent.click(lien);
    expect(trackEvent).toHaveBeenCalledWith("vulnerabilite_cta_eligibilite");
  });

  it("ne trace pas le clic d'un agent", () => {
    render(
      <VulnerabiliteProvider agent={agent}>
        <CalloutExpertRga eligibleFonds />
      </VulnerabiliteProvider>
    );

    fireEvent.click(screen.getByRole("link", { name: CTA }));
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("n'affiche pas le renvoi si le logement ne peut pas prétendre au fonds", () => {
    render(<CalloutExpertRga eligibleFonds={false} />);

    expect(screen.queryByRole("link", { name: CTA })).not.toBeInTheDocument();
  });
});
