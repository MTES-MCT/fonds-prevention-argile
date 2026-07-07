/**
 * Types du domaine « pièces justificatives à prévoir ».
 *
 * Une pièce est dérivée d'un PieceJustificativeChampDescriptor DN (libellé,
 * description, obligatoire, modèle téléchargeable) et enrichie d'une aide
 * éditoriale optionnelle (« où l'obtenir »).
 */

/** Modèle téléchargeable fourni par DN (fileTemplate). */
export interface PieceModele {
  filename: string;
  url: string;
}

/** Lien d'aide éditoriale (impots.gouv, service-public, CERFA…). */
export interface PieceAideLien {
  label: string;
  href: string;
}

/** Aide éditoriale « comment récupérer cette pièce ». Purement statique. */
export interface PieceAide {
  texte?: string;
  liens?: PieceAideLien[];
}

/** Pièce justificative à prévoir pour une étape, prête pour l'affichage. */
export interface PieceJustificative {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  modele?: PieceModele;
  aide?: PieceAide;
}
