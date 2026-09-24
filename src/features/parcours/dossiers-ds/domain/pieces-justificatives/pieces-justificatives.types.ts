import type { Step } from "@/shared/domain/value-objects/step.enum";

/**
 * Types du domaine « pièces justificatives à prévoir ».
 *
 * Une pièce est dérivée d'un PieceJustificativeChampDescriptor DN (libellé,
 * description, obligatoire, modèle téléchargeable). Aucun texte n'est ajouté par
 * l'application : la description affichée est celle de DN.
 */

/** Modèle téléchargeable fourni par DN (fileTemplate). */
export interface PieceModele {
  filename: string;
  url: string;
}

/** Ordre d'affichage des groupes : c'est aussi l'ordre de la maquette. */
export const PIECE_CATEGORIES = ["DEMANDEUR", "ASSURANCE", "AMO_EXPERT", "AUTRES"] as const;

/** Groupe d'affichage de la pièce. DN ne l'expose pas : déduit du libellé (pieces-regles). */
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
  categorie: PieceCategorie;
  condition?: PieceCondition;
}

/** Pièces à prévoir indexées par étape (pré-calculées côté serveur). */
export type PiecesByStep = Partial<Record<Step, PieceJustificative[]>>;
