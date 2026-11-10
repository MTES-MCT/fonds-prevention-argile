import { describe, it, expect } from "vitest";
import { annuaireDuDepartement, versAnnuaire, versGestion } from "./projections-experts";
import type { ExpertComplet } from "./experts.types";

function expert(champs: Partial<ExpertComplet> & { nom: string }): ExpertComplet {
  return {
    id: champs.nom,
    siret: "39248872200027",
    dateValidationDhup: "2026-05-15",
    contactInterneNom: "Camille Interne",
    contactInterneEmail: "interne@exemple.fr",
    contactInterneTelephone: "0600000000",
    desactiveAt: null,
    desactiveParNom: null,
    desactiveRaison: null,
    departements: [
      {
        codeDepartement: "36",
        email: "indre@exemple.fr",
        telephone: "0200000000",
        expertNom: null,
        expertEmail: null,
        expertTelephone: null,
        forfaitDiagnosticHt: null,
        forfaitReseauHt: null,
      },
    ],
    ...champs,
  };
}

describe("versAnnuaire", () => {
  it("ne laisse sortir ni le contact interne ni la désactivation", () => {
    const annuaire = versAnnuaire(expert({ nom: "Géotech", desactiveRaison: "Départ" }));
    expect(Object.keys(annuaire).sort()).toEqual(["dateValidationDhup", "departements", "id", "nom", "siret"]);
    expect(JSON.stringify(annuaire)).not.toContain("interne@exemple.fr");
    expect(JSON.stringify(annuaire)).not.toContain("Camille Interne");
  });

  it("donne aux agents l'expert qui se déplace dans chaque département", () => {
    const surPlace = {
      expertNom: "Paul Martin",
      expertEmail: "paul@exemple.fr",
      expertTelephone: "0611223344",
      forfaitDiagnosticHt: null,
      forfaitReseauHt: null,
    };
    const annuaire = versAnnuaire(
      expert({
        nom: "Géotech",
        departements: [{ codeDepartement: "36", email: "indre@exemple.fr", telephone: null, ...surPlace }],
      })
    );
    expect(annuaire.departements).toEqual([
      { code: "36", nom: "Indre", email: "indre@exemple.fr", telephone: null, ...surPlace },
    ]);
  });
});

describe("versGestion", () => {
  it("garde le contact interne et la désactivation pour le super-administrateur", () => {
    const gestion = versGestion(
      expert({
        nom: "Géotech",
        desactiveAt: new Date("2026-10-01T10:00:00Z"),
        desactiveParNom: "Sam Admin",
        desactiveRaison: "Départ à la retraite",
      })
    );
    expect(gestion.contactInterne.email).toBe("interne@exemple.fr");
    expect(gestion.desactivation).toEqual({
      le: "2026-10-01T10:00:00.000Z",
      par: "Sam Admin",
      raison: "Départ à la retraite",
    });
  });
});

describe("annuaireDuDepartement", () => {
  const experts = [
    expert({ nom: "Zeta Sols" }),
    expert({ nom: "Alpha Expertise" }),
    expert({ nom: "Désactivé", desactiveAt: new Date() }),
    expert({
      nom: "Ailleurs",
      departements: [
        {
          codeDepartement: "63",
          email: null,
          telephone: null,
          expertNom: null,
          expertEmail: null,
          expertTelephone: null,
          forfaitDiagnosticHt: null,
          forfaitReseauHt: null,
        },
      ],
    }),
    expert({
      nom: "Deux départements",
      departements: [
        {
          codeDepartement: "36",
          email: "36@exemple.fr",
          telephone: null,
          expertNom: null,
          expertEmail: null,
          expertTelephone: null,
          forfaitDiagnosticHt: null,
          forfaitReseauHt: null,
        },
        {
          codeDepartement: "18",
          email: "18@exemple.fr",
          telephone: null,
          expertNom: null,
          expertEmail: null,
          expertTelephone: null,
          forfaitDiagnosticHt: null,
          forfaitReseauHt: null,
        },
      ],
    }),
  ];

  it("ne garde que les experts actifs qui ont déclaré le département, dans l'ordre neutre", () => {
    expect(annuaireDuDepartement(experts, "36").map((e) => e.nom)).toEqual([
      "Alpha Expertise",
      "Deux départements",
      "Zeta Sols",
    ]);
  });

  it("ne garde que le contact du département demandé", () => {
    const deuxDepartements = annuaireDuDepartement(experts, "36").find((e) => e.nom === "Deux départements");
    expect(deuxDepartements?.departements).toEqual([
      {
        code: "36",
        nom: "Indre",
        email: "36@exemple.fr",
        telephone: null,
        expertNom: null,
        expertEmail: null,
        expertTelephone: null,
        forfaitDiagnosticHt: null,
        forfaitReseauHt: null,
      },
    ]);
  });

  it("renvoie une liste vide pour un département sans expert", () => {
    expect(annuaireDuDepartement(experts, "75")).toEqual([]);
  });
});
