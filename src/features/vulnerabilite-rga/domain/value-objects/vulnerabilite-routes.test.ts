import { describe, expect, it } from "vitest";
import { urlVulnerabiliteEmbarquee } from "./vulnerabilite-routes";

describe("urlVulnerabiliteEmbarquee", () => {
  it("renvoie la version embarquée du simulateur", () => {
    expect(urlVulnerabiliteEmbarquee(null)).toBe("/embed-vulnerabilite-rga");
  });

  it("transmet le partenaire pour garder son suivi", () => {
    expect(urlVulnerabiliteEmbarquee("maisons-sans-fissures")).toBe(
      "/embed-vulnerabilite-rga?partner=maisons-sans-fissures"
    );
  });
});
