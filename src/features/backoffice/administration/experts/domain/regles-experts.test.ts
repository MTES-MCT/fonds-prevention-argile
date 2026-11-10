import { describe, it, expect } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import {
  DEPARTEMENTS_OFFICIELS,
  departementsDeLaVue,
  estSiretValide,
  expertSchema,
  lireDepartements,
  perimetreExperts,
  peutConsulterDepartement,
  trierExperts,
  vueAffichee,
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

describe("vueAffichee", () => {
  it("ouvre tous les départements au super-administrateur, qui n'a pas de territoire", () => {
    expect(vueAffichee(perimetreExperts(UserRole.SUPER_ADMINISTRATEUR, []), undefined)).toEqual({ type: "tous" });
  });

  it("ouvre l'agent sur son département, ou sur son territoire regroupé s'il en couvre plusieurs", () => {
    expect(vueAffichee(perimetreExperts(UserRole.AMO, ["36"]), undefined)).toEqual({ type: "departement", code: "36" });
    expect(vueAffichee(perimetreExperts(UserRole.AMO, ["36", "24"]), undefined)).toEqual({ type: "territoire" });
    // Un Aller-vers couvert seulement par des EPCI n'a aucun département : il voit tout plutôt qu'une page vide.
    expect(vueAffichee(perimetreExperts(UserRole.ALLERS_VERS, []), undefined)).toEqual({ type: "tous" });
  });

  it("affiche la vue demandée si elle est permise, le territoire sinon", () => {
    const perimetre = perimetreExperts(UserRole.AMO, ["36"]);
    expect(vueAffichee(perimetre, "63")).toEqual({ type: "departement", code: "63" });
    expect(vueAffichee(perimetre, "tous")).toEqual({ type: "tous" });
    // Un seul département : pas de vue « territoire », il est affiché seul.
    expect(vueAffichee(perimetre, "territoire")).toEqual({ type: "departement", code: "36" });
    expect(vueAffichee(perimetre, "inconnu")).toEqual({ type: "departement", code: "36" });
  });

  it("ramène l'analyste sur son territoire quand il demande un autre département", () => {
    expect(vueAffichee(perimetreExperts(UserRole.ANALYSTE, ["36"]), "63")).toEqual({ type: "departement", code: "36" });
    expect(vueAffichee(perimetreExperts(UserRole.ANALYSTE, ["36", "24"]), undefined)).toEqual({ type: "tous" });
    expect(vueAffichee(perimetreExperts(UserRole.ANALYSTE, []), "tous")).toBeNull();
  });
});

describe("departementsDeLaVue", () => {
  it("donne au périmètre national les 11 départements du dispositif, même sans expert", () => {
    const tous = departementsDeLaVue(perimetreExperts(UserRole.SUPER_ADMINISTRATEUR, []), { type: "tous" });
    expect(tous).toEqual(["03", "04", "24", "32", "36", "47", "54", "59", "63", "81", "82"]);
  });

  it("garde les départements du territoire, même sans expert, pour le dire", () => {
    expect(departementsDeLaVue(perimetreExperts(UserRole.AMO, ["36", "18"]), { type: "territoire" })).toEqual(["36"]);
    expect(departementsDeLaVue(perimetreExperts(UserRole.AMO, ["36", "24"]), { type: "territoire" })).toEqual([
      "36",
      "24",
    ]);
    expect(departementsDeLaVue(perimetreExperts(UserRole.ANALYSTE, ["24"]), { type: "tous" })).toEqual(["24"]);
  });
});

describe("départements du dispositif", () => {
  it("ne laisse consulter aucun département hors des 11, même au super-administrateur", () => {
    const national = perimetreExperts(UserRole.SUPER_ADMINISTRATEUR, []);
    expect(peutConsulterDepartement(national, "36")).toBe(true);
    expect(peutConsulterDepartement(national, "75")).toBe(false);
    expect(vueAffichee(national, "75")).toEqual({ type: "tous" });
  });

  it("retire d'un territoire les départements hors du dispositif", () => {
    // Une AMO de production déclare aussi la Haute-Corse, les Alpes-Maritimes et l'Ardèche.
    expect(perimetreExperts(UserRole.AMO, ["2B", "04", "06", "07"])).toEqual({
      type: "tous",
      departementsParDefaut: ["04"],
    });
    expect(perimetreExperts(UserRole.ANALYSTE, ["75"])).toEqual({ type: "aucun" });
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
    departements: [{ code: "3", email: "", telephone: "04 00 00 00 00", expertNom: "", expertEmail: "" }],
  };

  it("normalise SIRET et départements, et vide les champs laissés blancs", () => {
    const resultat = expertSchema.parse(valide);
    expect(resultat.siret).toBe("39248872200027");
    expect(resultat.departements).toEqual([
      {
        code: "03",
        email: null,
        telephone: "04 00 00 00 00",
        expertNom: null,
        expertEmail: null,
        expertTelephone: null,
      },
    ]);
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
