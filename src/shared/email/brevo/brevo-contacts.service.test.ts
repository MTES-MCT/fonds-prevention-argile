import { describe, it, expect, vi, beforeEach } from "vitest";
import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { upsertContact, trackEvent } from "./brevo-contacts.adapter";
import {
  isBrevoContactSyncEnabled,
  resolveBrevoContactEmail,
  BREVO_ATTRS,
  BREVO_EVENTS,
} from "./brevo-contacts.config";
import { emitBrevoEvent } from "./brevo-contacts.service";

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findById: vi.fn() },
  userRepo: { findById: vi.fn() },
}));
vi.mock("./brevo-contacts.adapter", () => ({
  upsertContact: vi.fn(),
  trackEvent: vi.fn(),
}));
vi.mock("./brevo-contacts.config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./brevo-contacts.config")>()),
  isBrevoContactSyncEnabled: vi.fn(),
  resolveBrevoContactEmail: vi.fn(),
}));

const mockedEnabled = vi.mocked(isBrevoContactSyncEnabled);
const mockedResolveEmail = vi.mocked(resolveBrevoContactEmail);
const mockedParcours = vi.mocked(parcoursRepo.findById);
const mockedUser = vi.mocked(userRepo.findById);
const mockedUpsert = vi.mocked(upsertContact);
const mockedTrack = vi.mocked(trackEvent);

const parcours = {
  id: "p1",
  userId: "u1",
  currentStep: "choix_amo",
  currentStatus: "todo",
  situationParticulier: "prospect",
  createdAt: new Date("2026-07-21T10:00:00Z"),
  rgaSimulationData: null,
  rgaSimulationDataAgent: null,
} as unknown as Awaited<ReturnType<typeof parcoursRepo.findById>>;

const user = {
  id: "u1",
  prenom: "Jean",
  nom: "Dupont",
  email: "jean@gmail.com",
  emailContact: null,
  sourceAcquisition: null,
} as unknown as Awaited<ReturnType<typeof userRepo.findById>>;

describe("emitBrevoEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEnabled.mockReturnValue(true);
    mockedParcours.mockResolvedValue(parcours);
    mockedUser.mockResolvedValue(user);
    mockedResolveEmail.mockReturnValue("jean@gmail.com");
  });

  it("no-op quand la synchro est désactivée (aucune lecture BDD ni appel Brevo)", async () => {
    mockedEnabled.mockReturnValue(false);
    await emitBrevoEvent("p1", BREVO_EVENTS.DEMANDEUR_CREE);
    expect(mockedParcours).not.toHaveBeenCalled();
    expect(mockedUpsert).not.toHaveBeenCalled();
    expect(mockedTrack).not.toHaveBeenCalled();
  });

  it("no-op quand l'email n'est pas résoluble (staging sans boîte)", async () => {
    mockedResolveEmail.mockReturnValue(null);
    await emitBrevoEvent("p1", BREVO_EVENTS.DEMANDEUR_CREE);
    expect(mockedUpsert).not.toHaveBeenCalled();
    expect(mockedTrack).not.toHaveBeenCalled();
  });

  it("upsert le contact (attributs override mergés) puis enregistre l'évènement", async () => {
    await emitBrevoEvent("p1", BREVO_EVENTS.AMO_REPONSE, {
      attributes: { [BREVO_ATTRS.A_AMO]: true },
      eventProperties: { decision: "eligible" },
    });

    expect(mockedUpsert).toHaveBeenCalledWith(
      "jean@gmail.com",
      expect.objectContaining({ [BREVO_ATTRS.PRENOM]: "Jean", [BREVO_ATTRS.A_AMO]: true })
    );
    expect(mockedTrack).toHaveBeenCalledWith("jean@gmail.com", BREVO_EVENTS.AMO_REPONSE, { decision: "eligible" });
  });

  it("best-effort : n'échoue pas si l'adapter Brevo jette", async () => {
    mockedUpsert.mockRejectedValue(new Error("Brevo down"));
    await expect(emitBrevoEvent("p1", BREVO_EVENTS.DEMANDEUR_CREE)).resolves.toBeUndefined();
  });
});
