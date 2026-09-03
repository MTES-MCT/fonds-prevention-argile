import { describe, it, expect } from "vitest";
import { getUniqueEmails } from "./AgentsEmailExport";
import { createMockAgentWithPermissions } from "@/shared/testing/mocks";

function agent(email: string, desactiveAt: Date | null = null) {
  return createMockAgentWithPermissions({ agent: { id: email, email, desactiveAt } });
}

describe("getUniqueEmails", () => {
  it("exclut les agents désactivés de la copie de mails", () => {
    const emails = getUniqueEmails([
      agent("actif@gouv.fr"),
      agent("parti@gouv.fr", new Date("2026-09-01T10:00:00Z")),
      agent("autre@gouv.fr"),
    ]);

    expect(emails).toEqual(["actif@gouv.fr", "autre@gouv.fr"]);
  });

  it("dédoublonne sans tenir compte de la casse", () => {
    expect(getUniqueEmails([agent("Jean@gouv.fr"), agent("jean@gouv.fr")])).toEqual(["Jean@gouv.fr"]);
  });

  it("ignore les emails vides", () => {
    expect(getUniqueEmails([agent("  "), agent("valide@gouv.fr")])).toEqual(["valide@gouv.fr"]);
  });

  it("retourne une liste vide si tous les agents sont désactivés", () => {
    const desactive = new Date("2026-09-01T10:00:00Z");
    expect(getUniqueEmails([agent("a@gouv.fr", desactive), agent("b@gouv.fr", desactive)])).toEqual([]);
  });
});
