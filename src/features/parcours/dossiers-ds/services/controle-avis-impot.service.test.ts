import { describe, it, expect, vi, beforeEach } from "vitest";

const env = vi.hoisted(() => ({ DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID: "SW5zdHJ1Y3RldXItMQ==" }));
vi.mock("@/shared/config/env.config", () => ({ getServerEnv: vi.fn(() => env) }));

const client = vi.hoisted(() => ({ getDossierAvisImpot: vi.fn(), modifierAnnotations: vi.fn() }));
vi.mock("../adapters/graphql/client", () => ({ graphqlClient: client }));

import { controlerEtAnnoterAvisImpot } from "./controle-avis-impot.service";
import { FIXTURES_AVIS_IMPOT } from "../mappers/avis-impot.fixtures";
import { STATUTS_CONTROLE } from "../domain/avis-impot";

const ANNOTATION_PREPROD = "Q2hhbXAtNzAyMDIwNw==";
const MAINTENANT = new Date("2026-09-29T12:00:00Z");
const options = { codeRegion: "32", appliquer: true, maintenant: MAINTENANT };

describe("controlerEtAnnoterAvisImpot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getDossierAvisImpot.mockResolvedValue(FIXTURES_AVIS_IMPOT.lu);
  });

  it("écrit le verdict dans l'annotation texte long, au nom de l'instructeur configuré", async () => {
    const controle = await controlerEtAnnoterAvisImpot(1, options);

    expect(controle).toMatchObject({ issue: "ecrite", resultat: { statut: STATUTS_CONTROLE.COHERENT } });
    expect(client.modifierAnnotations).toHaveBeenCalledWith({
      dossierId: FIXTURES_AVIS_IMPOT.lu.id,
      instructeurId: "SW5zdHJ1Y3RldXItMQ==",
      annotations: [{ id: ANNOTATION_PREPROD, value: { textarea: controle?.texte } }],
    });
  });

  it("n'écrit rien en dry-run", async () => {
    const controle = await controlerEtAnnoterAvisImpot(1, { ...options, appliquer: false });

    expect(controle?.issue).toBe("simulation");
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("ne réécrit pas une annotation au contenu identique, seule la date changeant", async () => {
    const premier = await controlerEtAnnoterAvisImpot(1, { ...options, maintenant: new Date("2026-09-01T12:00:00Z") });
    client.getDossierAvisImpot.mockResolvedValue({
      ...FIXTURES_AVIS_IMPOT.lu,
      annotations: [{ champDescriptorId: ANNOTATION_PREPROD, stringValue: premier?.texte }],
    });
    client.modifierAnnotations.mockClear();

    const controle = await controlerEtAnnoterAvisImpot(1, options);

    expect(controle?.issue).toBe("inchangee");
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("n'écrit pas sur une démarche dont l'annotation n'est pas répertoriée", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    client.getDossierAvisImpot.mockResolvedValue({ ...FIXTURES_AVIS_IMPOT.lu, demarche: { number: 999 } });

    expect((await controlerEtAnnoterAvisImpot(1, options))?.issue).toBe("annotation_non_configuree");
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("renvoie null pour un dossier invisible", async () => {
    client.getDossierAvisImpot.mockResolvedValue(null);

    await expect(controlerEtAnnoterAvisImpot(1, options)).resolves.toBeNull();
  });

  it("laisse remonter un refus de DN", async () => {
    client.modifierAnnotations.mockRejectedValue(new Error("Annotations refusées : non autorisé"));

    await expect(controlerEtAnnoterAvisImpot(1, options)).rejects.toThrow("non autorisé");
  });
});
