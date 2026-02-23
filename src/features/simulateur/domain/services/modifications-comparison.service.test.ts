import { describe, it, expect } from "vitest";
import { computeModifications } from "./modifications-comparison.service";
import type { RGASimulationData, PartialRGASimulationData } from "@/shared/domain/types";
import type { EligibilityChecks } from "../entities/eligibility-result.entity";

/**
 * Données RGA de base pour les tests (éligibles)
 */
function createBaseRGAData(): RGASimulationData {
  return {
    logement: {
      adresse: "12 rue de Paris",
      code_region: "75",
      code_departement: "47",
      epci: "200023307",
      commune: "47001",
      commune_nom: "Agen",
      coordonnees: "44.203,0.616",
      clef_ban: "47001_0001",
      commune_denormandie: false,
      annee_de_construction: "1990",
      rnb: "",
      niveaux: 1,
      zone_dexposition: "fort",
      type: "maison",
      mitoyen: false,
      proprietaire_occupant: true,
    },
    taxeFonciere: {
      commune_eligible: true,
    },
    rga: {
      assure: true,
      indemnise_indemnise_rga: false,
      sinistres: "saine",
    },
    menage: {
      revenu_rga: 15000,
      personnes: 3,
    },
    vous: {},
    simulatedAt: "2025-01-01T00:00:00.000Z",
  };
}

/**
 * Checks tous éligibles
 */
function createAllEligibleChecks(): EligibilityChecks {
  return {
    maison: true,
    departementEligible: true,
    zoneForte: true,
    anneeConstruction: true,
    niveaux: true,
    etatMaison: true,
    nonMitoyen: true,
    indemnisation: true,
    assurance: true,
    proprietaireOccupant: true,
    revenusEligibles: true,
  };
}

describe("computeModifications", () => {
  it("retourne un tableau vide quand aucune modification n'a été faite", () => {
    const initialData = createBaseRGAData();
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toEqual([]);
  });

  it("détecte une modification du nombre d'habitants", () => {
    const initialData = createBaseRGAData();
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage, personnes: 4 },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "Habitants du logement",
      beforeDisplay: "3 habitants",
      afterDisplay: "4 habitants",
      wasEligible: true,
      isEligible: true,
    });
  });

  it("détecte une modification du nombre de niveaux", () => {
    const initialData = createBaseRGAData();
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement, niveaux: 2 },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "Nombre de niveaux",
      beforeDisplay: "1 niveau",
      afterDisplay: "2 niveaux",
    });
  });

  it("détecte plusieurs modifications simultanées", () => {
    const initialData = createBaseRGAData();
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement, niveaux: 2 },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage, personnes: 5 },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.label)).toContain("Nombre de niveaux");
    expect(result.map((m) => m.label)).toContain("Habitants du logement");
  });

  it("marque le critère comme non éligible quand il passe de true à false", () => {
    const initialData = createBaseRGAData();
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement, niveaux: 4 },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks: EligibilityChecks = {
      ...createAllEligibleChecks(),
      niveaux: false, // Le critère niveaux n'est plus passé
    };

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "Nombre de niveaux",
      beforeDisplay: "1 niveau",
      afterDisplay: "4 niveaux",
      wasEligible: true,
      isEligible: false,
    });
  });

  it("marque le critère comme éligible quand il passe de false à true", () => {
    const initialData = createBaseRGAData();
    initialData.logement.niveaux = 4; // Initialement non éligible

    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement, niveaux: 2 },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage },
    };
    const initialChecks: EligibilityChecks = {
      ...createAllEligibleChecks(),
      niveaux: false, // Initialement non éligible
    };
    const currentChecks = createAllEligibleChecks(); // Maintenant éligible

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "Nombre de niveaux",
      beforeDisplay: "4 niveaux",
      afterDisplay: "2 niveaux",
      wasEligible: false,
      isEligible: true,
    });
  });

  it("détecte une modification de boolean (mitoyenneté)", () => {
    const initialData = createBaseRGAData();
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement, mitoyen: true },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks: EligibilityChecks = {
      ...createAllEligibleChecks(),
      nonMitoyen: false,
    };

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "Mitoyenneté",
      beforeDisplay: "Non",
      afterDisplay: "Oui",
      wasEligible: true,
      isEligible: false,
    });
  });

  it("détecte une modification de l'état de la maison", () => {
    const initialData = createBaseRGAData();
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga, sinistres: "endommagée" },
      menage: { ...initialData.menage },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks: EligibilityChecks = {
      ...createAllEligibleChecks(),
      etatMaison: false,
    };

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "État de la maison",
      beforeDisplay: "Saine",
      afterDisplay: "Endommagée",
      wasEligible: true,
      isEligible: false,
    });
  });

  it("ignore les champs non définis dans les réponses courantes", () => {
    const initialData = createBaseRGAData();
    // Réponses partielles sans le champ menage
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toEqual([]);
  });

  it("ne détecte pas de modification de revenus quand la tranche reste la même", () => {
    const initialData = createBaseRGAData(); // revenu_rga: 15000, personnes: 3
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage, revenu_rga: 20000 }, // Différent montant, même tranche "très modeste"
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    // Seul le montant brut a changé, pas la tranche → pas de modification "Revenus"
    expect(result.find((m) => m.label === "Revenus")).toBeUndefined();
  });

  it("détecte une modification de revenus quand la tranche change", () => {
    const initialData = createBaseRGAData(); // revenu_rga: 15000, personnes: 3 → tranche "très modeste" (seuil: 30206)
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage, revenu_rga: 35000 }, // 35000 > 30206 → tranche "modeste" (seuil: 38719)
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    const revenuMod = result.find((m) => m.label === "Revenus");
    expect(revenuMod).toBeDefined();
    expect(revenuMod!.beforeDisplay).toBe("Très modeste");
    expect(revenuMod!.afterDisplay).toBe("Modeste");
  });

  it("affiche le nom de tranche capitalisé pour les revenus", () => {
    const initialData = createBaseRGAData(); // 15000, 3 pers → "très modeste"
    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage, revenu_rga: 55000 }, // > 51592 → tranche "supérieure"
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks: EligibilityChecks = {
      ...createAllEligibleChecks(),
      revenusEligibles: false,
    };

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    const revenuMod = result.find((m) => m.label === "Revenus");
    expect(revenuMod).toBeDefined();
    expect(revenuMod!.beforeDisplay).toBe("Très modeste");
    expect(revenuMod!.afterDisplay).toBe("Supérieure");
    expect(revenuMod!.wasEligible).toBe(true);
    expect(revenuMod!.isEligible).toBe(false);
  });

  it("formate correctement un seul habitant (singulier)", () => {
    const initialData = createBaseRGAData();
    initialData.menage.personnes = 2;

    const currentAnswers: PartialRGASimulationData = {
      logement: { ...initialData.logement },
      rga: { ...initialData.rga },
      menage: { ...initialData.menage, personnes: 1 },
    };
    const initialChecks = createAllEligibleChecks();
    const currentChecks = createAllEligibleChecks();

    const result = computeModifications(initialData, currentAnswers, initialChecks, currentChecks);

    expect(result).toHaveLength(1);
    expect(result[0].afterDisplay).toBe("1 habitant");
    expect(result[0].beforeDisplay).toBe("2 habitants");
  });
});
