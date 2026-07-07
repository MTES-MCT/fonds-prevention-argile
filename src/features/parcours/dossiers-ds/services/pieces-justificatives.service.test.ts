import { describe, it, expect, vi, beforeEach } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { ChampDescriptor, DemarcheDetailed } from "../adapters/graphql/types";

// IDs de démarches fixes pour la résolution étape → numéro.
const IDS = {
  eligibilite: "146377",
  diagnostic: "129894",
  devis: "150268",
  factures: "160000",
};

vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({
    DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE: IDS.eligibilite,
    DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC: IDS.diagnostic,
    DEMARCHES_SIMPLIFIEES_ID_DEVIS: IDS.devis,
    DEMARCHES_SIMPLIFIEES_ID_FACTURES: IDS.factures,
  })),
}));

// unstable_cache : pass-through (on exécute la fonction telle quelle en test).
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("../adapters/graphql/client", () => ({
  graphqlClient: { getDemarcheSchema: vi.fn() },
}));

import { getPiecesJustificativesForStep, resolveDemarcheNumberForStep } from "./pieces-justificatives.service";
import { PIECES_FALLBACK } from "../domain/pieces-justificatives";
import { graphqlClient } from "../adapters/graphql/client";

const mockedSchema = vi.mocked(graphqlClient.getDemarcheSchema);

function schemaWith(champDescriptors: ChampDescriptor[]): DemarcheDetailed {
  return {
    id: "d1",
    number: 1,
    title: "T",
    state: "publiee",
    dateCreation: "",
    dateDerniereModification: "",
    activeRevision: { id: "r1", champDescriptors },
  } as DemarcheDetailed;
}

const pieceIdentite: ChampDescriptor = {
  __typename: "PieceJustificativeChampDescriptor",
  id: "champ-1",
  label: "Pièce d'identité",
  required: true,
};

const pieceCerfa: ChampDescriptor = {
  __typename: "PieceJustificativeChampDescriptor",
  id: "champ-2",
  label: "Formulaire CERFA de désignation d'un mandataire",
  description: "À faire remplir par le mandataire.",
  required: false,
  fileTemplate: { filename: "cerfa.pdf", url: "https://dn/cerfa.pdf", contentType: "application/pdf" },
};

const champTexte: ChampDescriptor = {
  __typename: "TextChampDescriptor",
  id: "champ-3",
  label: "Nom",
  required: true,
};

describe("resolveDemarcheNumberForStep", () => {
  it("mappe chaque étape vers le bon numéro de démarche (amont éligibilité → éligibilité)", () => {
    expect(resolveDemarcheNumberForStep(Step.INVITATION)).toBe(Number(IDS.eligibilite));
    expect(resolveDemarcheNumberForStep(Step.CHOIX_AMO)).toBe(Number(IDS.eligibilite));
    expect(resolveDemarcheNumberForStep(Step.ELIGIBILITE)).toBe(Number(IDS.eligibilite));
    expect(resolveDemarcheNumberForStep(Step.DIAGNOSTIC)).toBe(Number(IDS.diagnostic));
    expect(resolveDemarcheNumberForStep(Step.DEVIS)).toBe(Number(IDS.devis));
    expect(resolveDemarcheNumberForStep(Step.FACTURES)).toBe(Number(IDS.factures));
  });
});

describe("getPiecesJustificativesForStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne garde que les champs de type pièce justificative et mappe label/required/description/modèle", async () => {
    mockedSchema.mockResolvedValue(schemaWith([pieceIdentite, champTexte, pieceCerfa]));

    const pieces = await getPiecesJustificativesForStep(Step.ELIGIBILITE);

    expect(pieces).toHaveLength(2);
    expect(pieces[0]).toMatchObject({ id: "champ-1", label: "Pièce d'identité", required: true });
    expect(pieces[0].modele).toBeUndefined();
    expect(pieces[1]).toMatchObject({
      id: "champ-2",
      required: false,
      description: "À faire remplir par le mandataire.",
      modele: { filename: "cerfa.pdf", url: "https://dn/cerfa.pdf" },
    });
  });

  it("enrichit d'une aide éditoriale quand le libellé matche (ex. CERFA / mandat)", async () => {
    mockedSchema.mockResolvedValue(schemaWith([pieceCerfa]));

    const [piece] = await getPiecesJustificativesForStep(Step.ELIGIBILITE);

    expect(piece.aide?.liens?.[0]?.href).toContain("cerfa_17596");
  });

  it("récupère aussi les pièces nichées dans un bloc répétable", async () => {
    const repetition: ChampDescriptor = {
      __typename: "RepetitionChampDescriptor",
      id: "rep-1",
      label: "Autres pièces",
      required: false,
      champDescriptors: [pieceIdentite],
    };
    mockedSchema.mockResolvedValue(schemaWith([repetition]));

    const pieces = await getPiecesJustificativesForStep(Step.ELIGIBILITE);

    expect(pieces).toHaveLength(1);
    expect(pieces[0].id).toBe("champ-1");
  });

  it("retombe sur le fallback si DN est injoignable (schéma null)", async () => {
    mockedSchema.mockResolvedValue(null);

    const pieces = await getPiecesJustificativesForStep(Step.DIAGNOSTIC);

    expect(pieces).toBe(PIECES_FALLBACK);
  });

  it("retombe sur le fallback si la démarche n'a aucune pièce", async () => {
    mockedSchema.mockResolvedValue(schemaWith([champTexte]));

    const pieces = await getPiecesJustificativesForStep(Step.DIAGNOSTIC);

    expect(pieces).toBe(PIECES_FALLBACK);
  });

  it("n'expose que les champs attendus (pas de fuite d'attributs internes DS)", async () => {
    mockedSchema.mockResolvedValue(schemaWith([pieceCerfa]));

    const [piece] = await getPiecesJustificativesForStep(Step.ELIGIBILITE);

    expect(Object.keys(piece).sort()).toEqual(["aide", "description", "id", "label", "modele", "required"].sort());
  });
});
