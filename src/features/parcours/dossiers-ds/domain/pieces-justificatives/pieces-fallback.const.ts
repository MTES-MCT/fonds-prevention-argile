import type { PieceJustificative } from "./pieces-justificatives.types";

/**
 * Liste de repli, affichée uniquement si DN est injoignable ou renvoie une liste
 * vide. Reprend la liste historiquement codée en dur (ancien PiecesJustificatives)
 * pour ne jamais régresser vers une section vide. Volontairement non dépendante de
 * l'étape (dernier recours). La source de vérité reste DN.
 */
export const PIECES_FALLBACK: PieceJustificative[] = [
  { id: "fallback-identite", label: "Pièce d'identité", required: true },
  {
    id: "fallback-avis-imposition",
    label: "Dernier avis d'imposition de TOUS les foyers fiscaux de l'habitation",
    required: true,
    aide: {
      texte: "Téléchargeable depuis votre espace particulier sur impots.gouv.fr.",
      liens: [{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/accueil" }],
    },
  },
  { id: "fallback-propriete", label: "Justificatif de propriété (taxe foncière)", required: true },
  { id: "fallback-rib", label: "RIB du demandeur", required: true },
  { id: "fallback-devis-amo", label: "Devis de l'AMO", required: true },
  { id: "fallback-devis-expert", label: "Devis de l'Expert", required: true },
  { id: "fallback-assurance-habitation", label: "Attestation d'assurance habitation", required: true },
  {
    id: "fallback-catnat-indemnisation",
    label: "Attestation (de non-)indemnisation de l'assureur au titre de la garantie Catastrophe Naturelle",
    required: true,
  },
  {
    id: "fallback-mandataire",
    label: "Si mandataire : sa pièce d'identité et le CERFA mandat RGA dûment rempli",
    required: false,
    aide: {
      liens: [
        {
          label: "CERFA mandat (service-public)",
          href: "https://www.formulaires.service-public.gouv.fr/gf/cerfa_17596.do",
        },
      ],
    },
  },
];
