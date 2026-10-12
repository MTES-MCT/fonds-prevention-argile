import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ParcoursProvider } from "./ParcoursProvider";
import { useParcoursContext } from "./ParcoursContext";
import { obtenirMonParcours } from "../actions";
import { syncAllUserDossiers } from "../../dossiers-ds/actions/dossier-sync.actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/auth/client", () => ({
  ROLES: { ADMINISTRATEUR: "administrateur" },
  useAuth: () => ({ isAuthenticated: true, user: { role: "particulier" } }),
}));
vi.mock("../actions", () => ({ obtenirMonParcours: vi.fn() }));
vi.mock("../../amo/actions", () => ({ getValidationAmo: vi.fn().mockResolvedValue({ success: false }) }));
vi.mock("../actions/eligibilite-query.actions", () => ({
  estLogementDeclareNonEligible: vi.fn().mockResolvedValue({ success: true, data: false }),
}));
vi.mock("../../dossiers-ds/actions/dossier-sync.actions", () => ({
  syncAllUserDossiers: vi.fn(),
  syncUserDossierStatus: vi.fn().mockResolvedValue({ success: true, data: { updated: false } }),
}));

let contexte: ReturnType<typeof useParcoursContext>;
function Sonde() {
  contexte = useParcoursContext();
  return <span data-testid="erreur">{contexte.error ?? ""}</span>;
}

describe("ParcoursProvider — synchro complète partielle", () => {
  beforeEach(() => {
    vi.mocked(obtenirMonParcours).mockResolvedValue({
      success: true,
      data: { parcours: null, dossiers: [], isComplete: false, prochainEtape: null },
    } as never);
  });

  it("garde l'erreur après le rafraîchissement et ne date pas lastSync", async () => {
    vi.mocked(syncAllUserDossiers).mockResolvedValue({
      success: true,
      data: { totalUpdated: 1, totalErreurs: 1, stepAdvanced: false },
    });
    render(
      <ParcoursProvider>
        <Sonde />
      </ParcoursProvider>
    );
    await waitFor(() => expect(obtenirMonParcours).toHaveBeenCalledTimes(1));

    await act(() => contexte.syncAll());

    expect(obtenirMonParcours).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("erreur").textContent).toBe("Certains dossiers n'ont pas pu être synchronisés");
    expect(contexte.lastSync).toBeNull();
  });
});
