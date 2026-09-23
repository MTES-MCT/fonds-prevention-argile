import type { Step } from "@/shared/domain/value-objects/step.enum";

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

/** Ordre d'affichage des groupes : c'est aussi l'ordre de la maquette. */
export const PIECE_CATEGORIES = ["DEMANDEUR", "ASSUREUR", "AMO_EXPERT", "AUTRES"] as const;

/** Qui fournit la pièce. DN ne l'expose pas : déduit du libellé (pieces-regles). */
export type PieceCategorie = (typeof PIECE_CATEGORIES)[number];

/** Condition d'obligation que DN n'expose pas : son `required` vaut « quand le champ est affiché ». */
export interface PieceCondition {
  libelle: string;
}

/** Pièce justificative à prévoir pour une étape, prête pour l'affichage. */
export interface PieceJustificative {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  modele?: PieceModele;
  aide?: PieceAide;
  categorie: PieceCategorie;
  condition?: PieceCondition;
}

/** Pièces à prévoir indexées par étape (pré-calculées côté serveur). */
export type PiecesByStep = Partial<Record<Step, PieceJustificative[]>>;
