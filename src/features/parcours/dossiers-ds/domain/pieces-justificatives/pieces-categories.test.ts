import { describe, it, expect } from "vitest";
import { grouperPiecesParCategorie, mentionObligation } from "./pieces-categories";
import { PIECES_FALLBACK } from "./pieces-fallback.const";
import type { PieceCategorie, PieceJustificative } from "./pieces-justificatives.types";

function piece(id: string, categorie: PieceCategorie): PieceJustificative {
  return { id, label: id, required: true, categorie };
}

describe("grouperPiecesParCategorie", () => {
  it("ordonne les groupes comme la maquette, quel que soit l'ordre DN", () => {
    const groupes = grouperPiecesParCategorie([
      piece("autre", "AUTRES"),
      piece("amo", "AMO_EXPERT"),
      piece("assureur", "ASSUREUR"),
      piece("demandeur", "DEMANDEUR"),
    ]);

    expect(groupes.map((g) => g.categorie)).toEqual(["DEMANDEUR", "ASSUREUR", "AMO_EXPERT", "AUTRES"]);
    expect(groupes[0].libelle).toBe("Pièces liées au demandeur (ou son mandataire)");
  });

  it("omet les groupes vides et conserve l'ordre DN dans un groupe", () => {
    const groupes = grouperPiecesParCategorie([piece("b", "DEMANDEUR"), piece("a", "DEMANDEUR")]);

    expect(groupes).toHaveLength(1);
    expect(groupes[0].pieces.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("ne perd aucune pièce", () => {
    const pieces = [piece("x", "AUTRES"), piece("y", "ASSUREUR"), piece("z", "AUTRES")];
    const total = grouperPiecesParCategorie(pieces).reduce((n, g) => n + g.pieces.length, 0);

    expect(total).toBe(pieces.length);
  });
});

describe("mentionObligation", () => {
  it("n'affiche rien pour une pièce obligatoire sans condition", () => {
    expect(mentionObligation({ required: true })).toBeUndefined();
  });

  it("affiche « Facultatif » pour une pièce non obligatoire sans condition", () => {
    expect(mentionObligation({ required: false })).toBe("Facultatif");
  });

  it("fait primer la condition sur `required`, dans les deux sens", () => {
    const condition = { libelle: "Obligatoire uniquement si indivision" };
    expect(mentionObligation({ required: true, condition })).toBe(condition.libelle);
    expect(mentionObligation({ required: false, condition })).toBe(condition.libelle);
  });
});

describe("PIECES_FALLBACK", () => {
  it("range chaque pièce de repli dans une catégorie de la maquette", () => {
    expect(PIECES_FALLBACK.filter((p) => p.categorie === "AUTRES")).toEqual([]);
  });
});
