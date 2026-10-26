import { describe, expect, it } from "vitest";
import {
  EMBED_SIMULATEUR_URL,
  EMBED_VULNERABILITE_RGA_URL,
  urlRenvoiIframe,
  vulnerabiliteRefuseeParIntegrateur,
} from "./renvoi-iframe";

describe("urlRenvoiIframe", () => {
  it("transmet le partenaire connu", () => {
    expect(urlRenvoiIframe(EMBED_VULNERABILITE_RGA_URL, " MAIF ")).toBe("/embed-vulnerabilite-rga?partner=maif");
  });

  it("ignore un partenaire absent ou inconnu", () => {
    expect(urlRenvoiIframe(EMBED_SIMULATEUR_URL, undefined)).toBe("/embed-simulateur");
    expect(urlRenvoiIframe(EMBED_SIMULATEUR_URL, "<script>")).toBe("/embed-simulateur");
  });
});

describe("vulnerabiliteRefuseeParIntegrateur", () => {
  it("ne refuse que sur ?vulnerabilite=0", () => {
    expect(vulnerabiliteRefuseeParIntegrateur("0")).toBe(true);
    expect(vulnerabiliteRefuseeParIntegrateur(undefined)).toBe(false);
    expect(vulnerabiliteRefuseeParIntegrateur("1")).toBe(false);
  });
});
