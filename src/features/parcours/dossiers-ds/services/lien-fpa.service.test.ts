import { describe, it, expect, vi, beforeEach } from "vitest";

const env = vi.hoisted(() => ({
  BASE_URL: "https://fpa.test",
  DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID: "SW5zdHJ1Y3RldXItMQ==",
}));
vi.mock("@/shared/config/env.config", () => ({ getServerEnv: vi.fn(() => env) }));
const client = vi.hoisted(() => ({ modifierAnnotations: vi.fn() }));
vi.mock("../adapters/graphql/client", () => ({ graphqlClient: client }));

import { Step } from "@/shared/domain/value-objects/step.enum";
import { completerLienFpa } from "./lien-fpa.service";
import { DS_FIELD_IDS } from "../domain/value-objects/ds-field-ids";
import { DS_ANNOTATION_LIEN_FPA_ELIGIBILITE } from "../domain/value-objects/ds-annotations";

const PARCOURS = "3f2c8f0e-1b2a-4c3d-9e8f-0a1b2c3d4e5f";
const LIEN = `https://fpa.test/espace-agent/dossiers/${PARCOURS}`;
const DIAGNOSTIC = DS_FIELD_IDS.DIAGNOSTIC.ANNOTATION_LIEN_FPA;

function completer(step: Step, annotations: Array<{ champDescriptorId: string; stringValue: string | null }>) {
  return completerLienFpa({
    parcoursId: PARCOURS,
    step,
    dsDemarcheId: "146377",
    dossierDnId: "RG9zc2llci0x",
    annotations,
  });
}

describe("completerLienFpa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.modifierAnnotations.mockResolvedValue(undefined);
  });

  it.each([null, "", "   "])("écrit le permalien du parcours dans une annotation vide (%o)", async (vide) => {
    await expect(completer(Step.DIAGNOSTIC, [{ champDescriptorId: DIAGNOSTIC, stringValue: vide }])).resolves.toBe(
      true
    );

    expect(client.modifierAnnotations).toHaveBeenCalledWith({
      dossierId: "RG9zc2llci0x",
      instructeurId: "SW5zdHJ1Y3RldXItMQ==",
      annotations: [{ id: DIAGNOSTIC, value: { text: LIEN } }],
    });
  });

  it("vise l'annotation propre à la démarche d'éligibilité", async () => {
    const id = DS_ANNOTATION_LIEN_FPA_ELIGIBILITE[146377];

    await completer(Step.ELIGIBILITE, [{ champDescriptorId: id, stringValue: null }]);

    expect(client.modifierAnnotations.mock.calls[0][0].annotations).toEqual([{ id, value: { text: LIEN } }]);
  });

  it("n'écrase jamais une valeur, même vers un autre parcours", async () => {
    const autre = "https://fpa.test/espace-agent/dossiers/00000000-0000-4000-8000-000000000000";

    await expect(completer(Step.DIAGNOSTIC, [{ champDescriptorId: DIAGNOSTIC, stringValue: autre }])).resolves.toBe(
      false
    );
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("ne fait rien quand l'annotation est absente du dossier ou l'étape sans lien", async () => {
    await expect(completer(Step.DIAGNOSTIC, [])).resolves.toBe(false);
    await expect(completer(Step.FACTURES, [{ champDescriptorId: DIAGNOSTIC, stringValue: null }])).resolves.toBe(false);
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("laisse remonter un refus de DN", async () => {
    client.modifierAnnotations.mockRejectedValue(new Error("Annotations refusées"));

    await expect(completer(Step.DIAGNOSTIC, [{ champDescriptorId: DIAGNOSTIC, stringValue: null }])).rejects.toThrow(
      "Annotations refusées"
    );
  });
});
