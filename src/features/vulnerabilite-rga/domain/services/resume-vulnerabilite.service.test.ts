import { describe, expect, it } from "vitest";
import { buildResumeVulnerabilite } from "./resume-vulnerabilite.service";
import type { PointVulnerabilite } from "./categorisation.service";

const point = (critereId: string, categorie: PointVulnerabilite["categorie"]): PointVulnerabilite => ({
  critereId,
  reponse: "x",
  categorie,
});

describe("buildResumeVulnerabilite", () => {
  it("annonce le niveau critique et range les points critiques avant ceux de vigilance", () => {
    const resume = buildResumeVulnerabilite([
      point("haies", "vigilance"),
      point("gouttieres", "critique"),
      point("vegetation_pied_facade", "critique"),
    ]);

    expect(resume.niveau).toBe("critique");
    expect(resume.compte).toMatchObject({ critique: 2, vigilance: 1 });
    expect(resume.pointsPrioritaires).toEqual(["Gouttières", "Végétation en pied de façade", "Haies"]);
  });

  it("se limite à trois points", () => {
    const resume = buildResumeVulnerabilite(
      ["gouttieres", "haies", "pente_terrain", "ensoleillement"].map((id) => point(id, "critique"))
    );

    expect(resume.pointsPrioritaires).toHaveLength(3);
  });

  it("annonce le niveau vigilance sans point critique", () => {
    expect(buildResumeVulnerabilite([point("haies", "vigilance")]).niveau).toBe("vigilance");
  });

  it("n'annonce aucun point quand seules des bonnes pratiques ou des points à surveiller sont relevés", () => {
    const resume = buildResumeVulnerabilite([point("gouttieres", "bonne_pratique"), point("haies", "a_verifier")]);

    expect(resume.niveau).toBe("aucun");
    expect(resume.pointsPrioritaires).toEqual([]);
  });
});
