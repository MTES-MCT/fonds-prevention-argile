import { describe, it, expect } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import {
  departementAffiche,
  DEPARTEMENTS_OFFICIELS,
  estSiretValide,
  expertSchema,
  lireDepartements,
  perimetreExperts,
  peutConsulterDepartement,
  trierExperts,
} from "./regles-experts";

describe("estSiretValide", () => {
  it("accepte un SIRET à la clé de Luhn valide", () => {
    expect(estSiretValide("39248872200027")).toBe(true);
  });

  it("refuse une faute de frappe, un SIREN et des lettres", () => {
    expect(estSiretValide("39248872200028")).toBe(false);
    expect(estSiretValide("392488722")).toBe(false);
    expect(estSiretValide("3924887220002A")).toBe(false);
  });

  it("applique la règle propre aux établissements de La Poste", () => {
    expect(estSiretValide("35600000000001")).toBe(true);
    expect(estSiretValide("35600000000002")).toBe(false);
  });
});

describe("lireDepartements", () => {
  it("lit un code, une liste et un libellé suivi du code", () => {
    expect(lireDepartements("63").codes).toEqual(["63"]);
    expect(lireDepartements("03 ; 36, Allier 03").codes).toEqual(["03", "36"]);
    expect(lireDepartements("2a, 971").codes).toEqual(["2A", "971"]);
  });

  it("rétablit le zéro initial qu'Excel retire", () => {
    expect(lireDepartements("3").codes).toEqual(["03"]);
  });

  it("signale tout ce qui n'est pas un département connu", () => {
    expect(lireDepartements("63, 99, Paris")).toEqual({ codes: ["63"], inconnus: ["99", "Paris"] });
  });
});

describe("perimetreExperts", () => {
  it("ouvre tout aux agents AMO et Aller-vers, leur territoire en premier", () => {
    expect(perimetreExperts(UserRole.AMO, ["3", "36"])).toEqual({ type: "tous", departementsParDefaut: ["03", "36"] });
    expect(perimetreExperts(UserRole.ALLERS_VERS, []).type).toBe("tous");
  });

  it("limite l'analyste départemental à son territoire", () => {
    const perimetre = perimetreExperts(UserRole.ANALYSTE, ["36"]);
    expect(peutConsulterDepartement(perimetre, "36")).toBe(true);
    expect(peutConsulterDepartement(perimetre, "63")).toBe(false);
  });

  it("ne donne rien à un analyste national ni à un demandeur", () => {
    expect(perimetreExperts(UserRole.ANALYSTE, [])).toEqual({ type: "aucun" });
    expect(perimetreExperts(UserRole.PARTICULIER, ["36"])).toEqual({ type: "aucun" });
  });
});

describe("departementAffiche", () => {
  it("ramène l'analyste sur son territoire quand il demande un autre département", () => {
    expect(departementAffiche(perimetreExperts(UserRole.ANALYSTE, ["36"]), "63")).toBe("36");
  });

  it("affiche le département demandé à un agent AMO, son territoire sinon", () => {
    const perimetre = perimetreExperts(UserRole.AMO, ["36"]);
    expect(departementAffiche(perimetre, "63")).toBe("63");
    expect(departementAffiche(perimetre, undefined)).toBe("36");
    expect(departementAffiche(perimetre, "inconnu")).toBe("36");
  });
});

describe("trierExperts", () => {
  it("range par raison sociale, sans tenir compte des accents ni de la casse", () => {
    const tries = trierExperts([{ nom: "géotech" }, { nom: "Expertise" }, { nom: "Ébène Sols" }, { nom: "alpha" }]);
    expect(tries.map((e) => e.nom)).toEqual(["alpha", "Ébène Sols", "Expertise", "géotech"]);
  });
});

describe("DEPARTEMENTS_OFFICIELS", () => {
  it("liste chaque département une seule fois, en code officiel", () => {
    const codes = DEPARTEMENTS_OFFICIELS.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("03");
    expect(codes).not.toContain("3");
    expect(codes).not.toContain("20");
  });
});

describe("expertSchema", () => {
  const valide = {
    nom: "Géotech",
    siret: "392 488 722 00027",
    departements: [{ code: "3", email: "", telephone: "04 00 00 00 00" }],
  };

  it("normalise SIRET et départements, et vide les champs laissés blancs", () => {
    const resultat = expertSchema.parse(valide);
    expect(resultat.siret).toBe("39248872200027");
    expect(resultat.departements).toEqual([{ code: "03", email: null, telephone: "04 00 00 00 00" }]);
    expect(resultat.contactInterneEmail).toBeNull();
  });

  it("refuse un département déclaré deux fois, même écrit différemment", () => {
    const resultat = expertSchema.safeParse({
      ...valide,
      departements: [{ code: "3" }, { code: "03" }],
    });
    expect(resultat.success).toBe(false);
  });

  it("refuse un expert sans département, ou avec un email invalide", () => {
    expect(expertSchema.safeParse({ ...valide, departements: [] }).success).toBe(false);
    expect(expertSchema.safeParse({ ...valide, departements: [{ code: "36", email: "pas-un-email" }] }).success).toBe(
      false
    );
  });
});
