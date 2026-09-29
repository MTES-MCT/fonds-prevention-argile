import { describe, it, expect } from "vitest";
import { decrireBilanPurge } from "./bilan-purge";

describe("decrireBilanPurge", () => {
  it("annonce les suppressions quand rien n'est conservé", () => {
    expect(decrireBilanPurge({ supprimees: ["A", "B"], conservees: [] }, "rattachées à un agent")).toBe(
      "Suppression préalable : 2 structures supprimées."
    );
  });

  it("nomme les structures conservées et le motif", () => {
    const message = decrireBilanPurge(
      { supprimees: ["A"], conservees: ["Soliha", "Adil 32"] },
      "rattachées à un agent"
    );
    expect(message).toContain("1 structure supprimée");
    expect(message).toContain("2 conservées car rattachées à un agent");
    expect(message).toContain("Soliha, Adil 32");
  });
});
