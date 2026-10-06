import { describe, it, expect } from "vitest";
import { dsStatusFromEtatDn, DSStatus } from "./ds-status";
import { dsStatusPgEnum } from "@/shared/database/enums/enums";

describe("dsStatusFromEtatDn", () => {
  it.each([
    ["en_construction", DSStatus.EN_CONSTRUCTION],
    ["en_instruction", DSStatus.EN_INSTRUCTION],
    ["accepte", DSStatus.ACCEPTE],
    ["refuse", DSStatus.REFUSE],
    ["sans_suite", DSStatus.CLASSE_SANS_SUITE],
  ])("traduit %s en une valeur de l'enum ds_status", (etat, attendu) => {
    const statut = dsStatusFromEtatDn(etat);

    expect(statut).toBe(attendu);
    expect(dsStatusPgEnum.enumValues).toContain(statut);
  });

  it("renvoie null pour un état que DN aurait ajouté", () => {
    expect(dsStatusFromEtatDn("en_attente_de_reponse")).toBeNull();
    expect(dsStatusFromEtatDn("toString")).toBeNull();
  });
});
