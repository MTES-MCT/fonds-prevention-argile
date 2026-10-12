import { describe, it, expect } from "vitest";
import { libelleMotifArchivage, MOTIF_SANS_MOTIF } from "./motif-archivage";

describe("libelleMotifArchivage", () => {
  it("garde la raison saisie", () => {
    expect(libelleMotifArchivage("Abandon du demandeur")).toBe("Abandon du demandeur");
  });

  it("regroupe raison absente et raison vide sous « Sans motif »", () => {
    expect([null, undefined, "", "  "].map(libelleMotifArchivage)).toEqual(Array(4).fill(MOTIF_SANS_MOTIF));
  });
});
