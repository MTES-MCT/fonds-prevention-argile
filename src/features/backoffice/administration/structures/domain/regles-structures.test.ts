import { describe, it, expect } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import {
  fusionnerIdentite,
  refusAjout,
  filtrerStructures,
  habilitationAllersVersSchema,
  habilitationAmoSchema,
  identiteStructureSchema,
  refusRetrait,
  refusSuppression,
  roleApres,
  type FiltresStructures,
  type StructureListee,
} from "./regles-structures";

const AMO_ET_AV = { amo: true, allersVers: true, expert: false };
const AMO_SEULE = { amo: true, allersVers: false, expert: false };
const EXPERT_SEUL = { amo: false, allersVers: false, expert: true };

describe("identiteStructureSchema", () => {
  it("retire les espaces du SIRET et accepte une clé de contrôle fausse, comme celles déjà en base", () => {
    const identite = identiteStructureSchema.parse({ nom: " Soliha 36 ", siret: "392 488 722 00028" });
    expect(identite).toEqual({ nom: "Soliha 36", siret: "39248872200028", adresse: "", telephone: "", horaires: null });
  });

  it("lit un SIRET vide comme absent et refuse un SIRET qui n'a pas 14 chiffres", () => {
    expect(identiteStructureSchema.parse({ nom: "Adil", siret: "" }).siret).toBeNull();
    expect(identiteStructureSchema.safeParse({ nom: "Adil", siret: "123" }).success).toBe(false);
  });

  it("refuse un nom vide et un téléphone qui n'en est pas un", () => {
    expect(identiteStructureSchema.safeParse({ nom: " " }).success).toBe(false);
    expect(identiteStructureSchema.safeParse({ nom: "Adil", telephone: "appelez-nous" }).success).toBe(false);
  });
});

describe("habilitations", () => {
  it("range les emails de l'AMO séparés par un point-virgule, quel que soit le séparateur saisi", () => {
    const amo = habilitationAmoSchema.parse({ departements: "Indre 36; Cher 18", emails: "a@amo.fr, b@amo.fr" });
    expect(amo).toEqual({ departements: "Indre 36, Cher 18", emails: "a@amo.fr;b@amo.fr", communes: [], epci: [] });
  });

  it("refuse une AMO sans email valide", () => {
    expect(habilitationAmoSchema.safeParse({ departements: "Indre 36", emails: "pas-un-email" }).success).toBe(false);
  });

  it("remet au format officiel les départements de l'Aller-vers et exige un territoire", () => {
    const av = habilitationAllersVersSchema.parse({ emails: "a@av.fr", departements: ["3", "36"] });
    expect(av.departements).toEqual(["03", "36"]);
    expect(habilitationAllersVersSchema.safeParse({ emails: "a@av.fr", departements: [] }).success).toBe(false);
  });
});

describe("rôles des agents", () => {
  it("donne le rôle cumulé quand l'Aller-vers rejoint l'AMO", () => {
    expect(roleApres(AMO_SEULE, "allersVers", true)).toBe(UserRole.AMO_ET_ALLERS_VERS);
  });

  it("ne mêle jamais l'expertise à l'accompagnement", () => {
    expect(refusAjout("accompagnement", AMO_SEULE, "allersVers")).toBeNull();
    expect(refusAjout("accompagnement", AMO_SEULE, "expert")).toContain("créez une structure expert");
    expect(refusAjout("expert", EXPERT_SEUL, "amo")).toContain("ne porte que l'habilitation expert");
    expect(refusAjout("accompagnement", AMO_SEULE, "amo")).toContain("déjà");
  });

  it("garde toujours une habilitation : la dernière ne se retire pas", () => {
    expect(refusRetrait(AMO_SEULE, "amo", 0)).toContain("dernière habilitation");
    expect(refusRetrait(AMO_ET_AV, "amo", 2)).toBeNull();
  });

  it("supprime une structure sans agent ni dossier, habilitations comprises", () => {
    expect(refusSuppression(1, 0)).toContain("agents");
    expect(refusSuppression(0, 3)).toContain("3 dossier(s)");
    expect(refusSuppression(0, 0)).toBeNull();
  });
});

describe("fusionnerIdentite", () => {
  const FICHE = { nom: "Soliha 36", siret: "39248872200027", adresse: "", telephone: "02 54 00 00 00", horaires: null };
  const FICHIER = {
    nom: "SOLIHA INDRE",
    siret: "39248872200027",
    adresse: "1 rue de la Gare",
    telephone: "0254000000",
    horaires: null,
  };

  it("complète les champs vides de la fiche et signale les autres écarts, sans les reprendre", () => {
    // Le téléphone se compare chiffres à chiffres : la mise en forme seule n'est pas un écart.
    expect(fusionnerIdentite(FICHE, FICHIER, false)).toEqual({
      identite: { ...FICHE, adresse: "1 rue de la Gare" },
      complements: ["adresse"],
      remplacements: [],
      ecarts: ["nom"],
    });
  });

  it("remplace sur demande, jamais le SIRET qui désigne la structure", () => {
    const resultat = fusionnerIdentite(FICHE, { ...FICHIER, siret: "12345678901234" }, true);
    expect(resultat.identite).toMatchObject({ nom: "SOLIHA INDRE", siret: "39248872200027" });
    expect(resultat.remplacements).toEqual(["nom"]);
    expect(resultat.ecarts).toEqual(["SIRET"]);
  });
});

describe("filtrerStructures", () => {
  const structure = (
    nom: string,
    siret: string | null,
    habilitations: StructureListee["habilitations"],
    departements: string[]
  ) =>
    ({
      id: nom,
      type: habilitations.expert ? ("expert" as const) : ("accompagnement" as const),
      nom,
      siret,
      habilitations,
      expertDesactive: false,
      departements,
      agentsActifs: 0,
    }) satisfies StructureListee;
  const LISTE = [
    structure("Soliha Indre", "39248872200027", AMO_ET_AV, ["36"]),
    structure("Géotech", "12345678900007", { amo: false, allersVers: false, expert: true }, ["63"]),
    structure("Espace conseil", null, { amo: false, allersVers: true, expert: false }, ["18"]),
  ];
  const filtres = { habilitations: [], departement: null, recherche: "" };

  it("filtre par habilitations cumulées et par département", () => {
    const noms = (habilitations: FiltresStructures["habilitations"]) =>
      filtrerStructures(LISTE, { ...filtres, habilitations }).map((s) => s.nom);
    expect(noms(["expert"])).toEqual(["Géotech"]);
    expect(noms(["allersVers"])).toEqual(["Soliha Indre", "Espace conseil"]);
    expect(noms(["amo", "expert"])).toEqual(["Soliha Indre", "Géotech"]);
    expect(filtrerStructures(LISTE, { ...filtres, departement: "36" }).map((s) => s.nom)).toEqual(["Soliha Indre"]);
  });

  it("cherche dans le nom sans tenir compte des accents, et dans le SIRET sans ses espaces", () => {
    expect(filtrerStructures(LISTE, { ...filtres, recherche: "geotech" }).map((s) => s.nom)).toEqual(["Géotech"]);
    expect(filtrerStructures(LISTE, { ...filtres, recherche: "392 488" }).map((s) => s.nom)).toEqual(["Soliha Indre"]);
  });
});
