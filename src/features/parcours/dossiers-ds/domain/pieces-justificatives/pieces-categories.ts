import { PIECE_CATEGORIES, type PieceCategorie, type PieceJustificative } from "./pieces-justificatives.types";

export const PIECE_CATEGORIE_LIBELLES: Record<PieceCategorie, string> = {
  DEMANDEUR: "Pièces liées au demandeur (ou son mandataire)",
  ASSURANCE: "Pièces liées à l'assurance",
  AMO_EXPERT: "Pièces liées à l'AMO et l'Expert",
  AUTRES: "Autres pièces",
};

// Une entrée de cache antérieure peut porter une catégorie disparue : la pièce doit rester visible.
function categorieAffichee(piece: PieceJustificative): PieceCategorie {
  return PIECE_CATEGORIES.includes(piece.categorie) ? piece.categorie : "AUTRES";
}

export interface GroupePieces {
  categorie: PieceCategorie;
  libelle: string;
  pieces: PieceJustificative[];
}

/** Groupes non vides dans l'ordre de la maquette ; l'ordre DN est conservé dans chaque groupe. */
export function grouperPiecesParCategorie(pieces: PieceJustificative[]): GroupePieces[] {
  return PIECE_CATEGORIES.map((categorie) => ({
    categorie,
    libelle: PIECE_CATEGORIE_LIBELLES[categorie],
    pieces: pieces.filter((piece) => categorieAffichee(piece) === categorie),
  })).filter((groupe) => groupe.pieces.length > 0);
}

/** Exception à « sauf mention contraire, toutes les pièces sont obligatoires » ; la condition prime sur `required`. */
export function mentionObligation(piece: Pick<PieceJustificative, "required" | "condition">): string | undefined {
  if (piece.condition) return piece.condition.libelle;
  return piece.required ? undefined : "Facultatif";
}
