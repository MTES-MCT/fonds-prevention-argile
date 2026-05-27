import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildDemarcheUrl,
  getDossierDsDemandeUrl,
  getDossierDsMessagerieUrl,
  getDossierDsInstructeurUrl,
} from "./ds-url.utils";
import { DSStatus } from "../domain/value-objects/ds-status";
import { getSharedEnv } from "@/shared/config/env.config";

vi.mock("@/shared/config/env.config", () => ({
  getSharedEnv: vi.fn(),
}));

const mockedGetSharedEnv = vi.mocked(getSharedEnv);

const PREFILL_URL = "https://www.demarches-simplifiees.fr/commencer/abc123?prefill_token=TOKEN42";
const STABLE_URL = "https://www.demarches-simplifiees.fr/dossiers/999/demande";

describe("ds-url.utils", () => {
  beforeEach(() => {
    mockedGetSharedEnv.mockReturnValue({
      NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL: "https://www.demarches-simplifiees.fr",
    } as ReturnType<typeof getSharedEnv>);
  });

  describe("buildDemarcheUrl", () => {
    it("retourne l'URL prefill quand le dossier est EN_CONSTRUCTION", () => {
      expect(
        buildDemarcheUrl({
          dsStatus: DSStatus.EN_CONSTRUCTION,
          dsNumber: "999",
          dsUrl: PREFILL_URL,
        })
      ).toBe(PREFILL_URL);
    });

    it("retourne l'URL stable /dossiers/<n>/demande quand le dossier est EN_INSTRUCTION (ignore l'URL prefill stockée)", () => {
      expect(
        buildDemarcheUrl({
          dsStatus: DSStatus.EN_INSTRUCTION,
          dsNumber: "999",
          dsUrl: PREFILL_URL,
        })
      ).toBe(STABLE_URL);
    });

    it.each([
      [DSStatus.ACCEPTE, "ACCEPTE"],
      [DSStatus.REFUSE, "REFUSE"],
      [DSStatus.CLASSE_SANS_SUITE, "CLASSE_SANS_SUITE"],
    ])("retourne l'URL stable pour les statuts terminaux (%s)", (status) => {
      expect(
        buildDemarcheUrl({
          dsStatus: status,
          dsNumber: "999",
          dsUrl: PREFILL_URL,
        })
      ).toBe(STABLE_URL);
    });

    it("retourne undefined quand le statut est NON_ACCESSIBLE même si dsNumber et dsUrl sont présents", () => {
      expect(
        buildDemarcheUrl({
          dsStatus: DSStatus.NON_ACCESSIBLE,
          dsNumber: "999",
          dsUrl: PREFILL_URL,
        })
      ).toBeUndefined();
    });

    it("fallback vers l'URL stable quand EN_CONSTRUCTION mais sans dsUrl prefill stockée", () => {
      expect(
        buildDemarcheUrl({
          dsStatus: DSStatus.EN_CONSTRUCTION,
          dsNumber: "999",
          dsUrl: null,
        })
      ).toBe(STABLE_URL);
    });

    it("fallback vers l'URL prefill quand soumis mais sans dsNumber (cas dégradé)", () => {
      expect(
        buildDemarcheUrl({
          dsStatus: DSStatus.EN_INSTRUCTION,
          dsNumber: null,
          dsUrl: PREFILL_URL,
        })
      ).toBe(PREFILL_URL);
    });

    it("retourne undefined quand ni dsNumber ni dsUrl ne sont disponibles", () => {
      expect(
        buildDemarcheUrl({
          dsStatus: DSStatus.EN_INSTRUCTION,
          dsNumber: null,
          dsUrl: null,
        })
      ).toBeUndefined();
    });

    it("retourne undefined quand le statut est null et qu'il n'y a aucune donnée", () => {
      expect(
        buildDemarcheUrl({
          dsStatus: null,
          dsNumber: null,
          dsUrl: null,
        })
      ).toBeUndefined();
    });
  });

  describe("getDossierDsDemandeUrl", () => {
    it("construit l'URL /dossiers/<n>/demande", () => {
      expect(getDossierDsDemandeUrl(12345)).toBe("https://www.demarches-simplifiees.fr/dossiers/12345/demande");
    });

    it("retourne # quand dsNumber est manquant", () => {
      expect(getDossierDsDemandeUrl(null)).toBe("#");
      expect(getDossierDsDemandeUrl(undefined)).toBe("#");
      expect(getDossierDsDemandeUrl(0)).toBe("#");
    });

    it("utilise l'URL de base par défaut si la variable d'env est absente", () => {
      mockedGetSharedEnv.mockReturnValue({} as ReturnType<typeof getSharedEnv>);
      expect(getDossierDsDemandeUrl(42)).toBe("https://www.demarches-simplifiees.fr/dossiers/42/demande");
    });

    it("respecte une URL de base custom (env de staging par ex.)", () => {
      mockedGetSharedEnv.mockReturnValue({
        NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL: "https://staging.demarches-simplifiees.fr",
      } as ReturnType<typeof getSharedEnv>);
      expect(getDossierDsDemandeUrl(42)).toBe("https://staging.demarches-simplifiees.fr/dossiers/42/demande");
    });
  });

  describe("getDossierDsMessagerieUrl", () => {
    it("construit l'URL /dossiers/<n>/messagerie", () => {
      expect(getDossierDsMessagerieUrl(12345)).toBe("https://www.demarches-simplifiees.fr/dossiers/12345/messagerie");
    });

    it("retourne # quand dsNumber est manquant", () => {
      expect(getDossierDsMessagerieUrl(null)).toBe("#");
      expect(getDossierDsMessagerieUrl(undefined)).toBe("#");
    });
  });

  describe("getDossierDsInstructeurUrl", () => {
    it("construit l'URL back-office /procedures/<demarcheId>/dossiers/<n>", () => {
      expect(getDossierDsInstructeurUrl("777", 12345)).toBe(
        "https://www.demarches-simplifiees.fr/procedures/777/dossiers/12345"
      );
    });

    it("accepte aussi dsNumber sous forme de string", () => {
      expect(getDossierDsInstructeurUrl("777", "12345")).toBe(
        "https://www.demarches-simplifiees.fr/procedures/777/dossiers/12345"
      );
    });

    it("retourne # quand dsDemarcheId ou dsNumber est manquant", () => {
      expect(getDossierDsInstructeurUrl(null, 12345)).toBe("#");
      expect(getDossierDsInstructeurUrl("777", null)).toBe("#");
      expect(getDossierDsInstructeurUrl(null, null)).toBe("#");
    });
  });
});
