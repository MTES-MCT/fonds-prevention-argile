import { describe, expect, it } from "vitest";
import { estDoublonBloquant, presenterDoublon } from "./doublon";

describe("doublon de demandeur", () => {
  it("bloque un email connu mais laisse confirmer un logement déjà connu", () => {
    expect(estDoublonBloquant("compte")).toBe(true);
    expect(estDoublonBloquant("invitation")).toBe(true);
    expect(estDoublonBloquant("adresse")).toBe(false);
  });

  it("renvoie vers l'équipe quand le dossier existant n'est pas dans le périmètre de l'agent", () => {
    const visible = presenterDoublon("compte", "/espace-agent/dossiers/v-1");
    const horsPerimetre = presenterDoublon("compte", null);

    expect(visible.message).not.toContain("contactez");
    expect(horsPerimetre.message).toContain("contactez l'équipe du Fonds Prévention Argile");
    expect(horsPerimetre.lien).toBeNull();
  });
});
