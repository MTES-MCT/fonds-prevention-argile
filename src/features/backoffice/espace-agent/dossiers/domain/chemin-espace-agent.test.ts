import { describe, expect, it } from "vitest";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { cheminEspaceAgent } from "./chemin-espace-agent";

const PARCOURS_ID = "11111111-1111-4111-8111-111111111111";
const VALIDATION_ID = "22222222-2222-4222-8222-222222222222";

function validation(statut: StatutValidationAmo, entrepriseAmoId: string | null = "e1") {
  return { id: VALIDATION_ID, statut, entrepriseAmoId };
}

describe("cheminEspaceAgent", () => {
  it("ouvre un dossier sans validation sur la fiche prospect", () => {
    expect(cheminEspaceAgent({ parcoursId: PARCOURS_ID, archivedAt: null, validation: null })).toBe(
      `/espace-agent/prospects/${PARCOURS_ID}`
    );
  });

  it("ouvre une demande que l'AMO doit trancher sur la fiche demande", () => {
    expect(
      cheminEspaceAgent({
        parcoursId: PARCOURS_ID,
        archivedAt: null,
        validation: validation(StatutValidationAmo.EN_ATTENTE),
      })
    ).toBe(`/espace-agent/demandes/${VALIDATION_ID}`);
  });

  it.each([
    ["une demande archivée", StatutValidationAmo.EN_ATTENTE, "e1", new Date()],
    ["une demande sans entreprise", StatutValidationAmo.EN_ATTENTE, null, null],
    ["un dossier éligible", StatutValidationAmo.LOGEMENT_ELIGIBLE, "e1", null],
    ["un dossier en autonomie", StatutValidationAmo.SANS_AMO, null, null],
  ])("ouvre %s sur la fiche dossier", (_cas, statut, entrepriseAmoId, archivedAt) => {
    expect(
      cheminEspaceAgent({ parcoursId: PARCOURS_ID, archivedAt, validation: validation(statut, entrepriseAmoId) })
    ).toBe(`/espace-agent/dossiers/${VALIDATION_ID}`);
  });
});
