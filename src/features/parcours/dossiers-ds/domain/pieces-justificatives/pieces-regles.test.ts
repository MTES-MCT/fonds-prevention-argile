import { describe, it, expect } from "vitest";
import { classerPiece, normalizeLabel } from "./pieces-regles";
import type { PieceCategorie } from "./pieces-justificatives.types";

describe("normalizeLabel", () => {
  it("passe en minuscules, retire les accents et compacte les espaces", () => {
    expect(normalizeLabel("  Pièce   d'Identité ")).toBe("piece d'identite");
  });

  it("ramène l'apostrophe typographique à l'apostrophe droite", () => {
    expect(normalizeLabel("Attestation sur l’honneur")).toBe("attestation sur l'honneur");
  });
});

// Libellés DN relevés le 2026-09-22 avec `pnpm ds:fetch-pieces`, coquilles et apostrophes comprises.
const LIBELLES_DN: [string, PieceCategorie, string | undefined][] = [
  // Éligibilité (démarche 146377)
  ["Pièce d'identité", "DEMANDEUR", undefined],
  ["Dernier avis d'imposition", "DEMANDEUR", undefined],
  ["Pièce d'identité du représentant légal", "DEMANDEUR", "Uniquement si représentant légal"],
  [
    "Formulaire CERFA de désignation d'un mandataire de gestion administrative",
    "AMO_EXPERT",
    "Uniquement si demandeur accompagné",
  ],
  ["Devis pour la phase étude du fonds de prévention argile", "AMO_EXPERT", undefined],
  ["Attestation sur l'honneur de l'expert en RGA réalisant le diagnostic de vulnérabilité", "AMO_EXPERT", undefined],
  [
    "Relevé d'identité bancaire du mandataire financier pour le paiement de la subvention",
    "AMO_EXPERT",
    "Uniquement si AMO mandataire financier",
  ],
  [
    "Relevé d'identité bancaire du propriétaire demandeur pour le paiement de la subvention",
    "DEMANDEUR",
    "Sauf si AMO mandataire financier",
  ],
  ["Justificatif de propriété", "DEMANDEUR", undefined],
  [
    "Attestion sur l'honneur indiquant que la maison a plus de 15 ans",
    "DEMANDEUR",
    "Uniquement sans document officiel indiquant l'année de construction",
  ],
  [
    "Attestation sur l'honneur du représentant unique de l'indivision",
    "DEMANDEUR",
    "Obligatoire uniquement si indivision",
  ],
  ["Attestation d'assurance habitation", "ASSURANCE", undefined],
  ["Attestation sur l’honneur de votre assureur de non sinistralité catastrophe naturelle", "ASSURANCE", undefined],
  [
    "Attestation sur l'honneur que vous n'avez pas de demande d'indemnisation catastrophe naturelle en cours",
    "ASSURANCE",
    undefined,
  ],
  // Diagnostic (démarche 129894)
  [
    "Rapport du diagnostic de vulnérabilité, avec des photos de votre maison et de son environnement proche, daté et signé avec le cachet de l'entreprise l'ayant réalisées",
    "AMO_EXPERT",
    undefined,
  ],
  ["Facture(s) acquittées détaillant les prestations effectivement réalisées", "AMO_EXPERT", undefined],
  [
    "Autres financeurs (collectivités locales, assureurs, notamment.)",
    "DEMANDEUR",
    "Uniquement si d'autres financeurs interviennent",
  ],
  // Devis travaux (démarche 150274)
  ["Attestation sur l'honneur du maître d'oeuvre justifiant :", "AUTRES", undefined],
  ["Devis maîtrise d'oeuvre et accompagnement administratifs", "AUTRES", undefined],
  ["Devis des travaux", "AUTRES", undefined],
];

describe("classerPiece — libellés DN réels", () => {
  it.each(LIBELLES_DN)("%s → %s", (label, categorie, condition) => {
    const classement = classerPiece(label);
    expect(classement.categorie).toBe(categorie);
    expect(classement.condition?.libelle).toBe(condition);
  });
});

describe("classerPiece — ordre des règles", () => {
  it("range les attestations catastrophe naturelle dans l'assurance, qu'elles viennent de l'assureur ou du demandeur", () => {
    expect(classerPiece("Attestation de votre assureur … catastrophe naturelle").categorie).toBe("ASSURANCE");
    expect(classerPiece("Pas de demande d'indemnisation catastrophe naturelle").categorie).toBe("ASSURANCE");
  });

  it("ne range pas « autres financeurs » dans l'assurance malgré le mot « assureurs »", () => {
    expect(classerPiece("Autres financeurs (assureurs)").categorie).toBe("DEMANDEUR");
  });

  it("distingue le RIB du mandataire de celui du propriétaire", () => {
    expect(classerPiece("Relevé d'identité bancaire du mandataire financier").categorie).toBe("AMO_EXPERT");
    expect(classerPiece("Relevé d'identité bancaire du propriétaire").categorie).toBe("DEMANDEUR");
  });
});

describe("classerPiece — libellé inconnu", () => {
  it("tombe dans « Autres pièces », sans condition", () => {
    expect(classerPiece("Plan cadastral")).toEqual({ categorie: "AUTRES" });
  });
});
