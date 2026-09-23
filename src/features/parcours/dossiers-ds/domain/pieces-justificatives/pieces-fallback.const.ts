import type { PieceJustificative } from "./pieces-justificatives.types";

/**
 * Liste de repli, affichée uniquement si DN est injoignable ou renvoie une liste
 * vide. Reprend la liste historiquement codée en dur (ancien PiecesJustificatives)
 * pour ne jamais régresser vers une section vide. Volontairement non dépendante de
 * l'étape (dernier recours). La source de vérité reste DN. Catégories explicites : ces
 * libellés ne sont pas ceux de DN, la table de règles ne les reconnaîtrait pas.
 */
export const PIECES_FALLBACK: PieceJustificative[] = [
  { id: "fallback-identite", label: "Pièce d'identité", required: true, categorie: "DEMANDEUR" },
  {
    id: "fallback-avis-imposition",
    label: "Dernier avis d'imposition de TOUS les foyers fiscaux de l'habitation",
    required: true,
    categorie: "DEMANDEUR",
    aide: {
      texte: "Téléchargeable depuis votre espace particulier sur impots.gouv.fr.",
      liens: [{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/accueil" }],
    },
  },
  {
    id: "fallback-propriete",
    label: "Justificatif de propriété (taxe foncière)",
    required: true,
    categorie: "DEMANDEUR",
  },
  {
    id: "fallback-rib",
    label: "RIB du demandeur",
    required: true,
    categorie: "DEMANDEUR",
    condition: { libelle: "Sauf si AMO mandataire financier" },
  },
  {
    id: "fallback-assurance-habitation",
    label: "Attestation d'assurance habitation",
    required: true,
    categorie: "ASSUREUR",
    condition: { libelle: "Uniquement si la maison est assurée" },
  },
  {
    id: "fallback-catnat-indemnisation",
    label: "Attestation (de non-)indemnisation de l'assureur au titre de la garantie Catastrophe Naturelle",
    required: true,
    categorie: "ASSUREUR",
  },
  {
    id: "fallback-devis-amo",
    label: "Devis de l'AMO",
    required: true,
    categorie: "AMO_EXPERT",
    condition: { libelle: "Uniquement si demandeur accompagné" },
  },
  { id: "fallback-devis-expert", label: "Devis de l'Expert", required: true, categorie: "AMO_EXPERT" },
  {
    id: "fallback-mandataire",
    label: "Pièce d'identité du mandataire et CERFA mandat RGA dûment rempli",
    required: false,
    categorie: "AMO_EXPERT",
    condition: { libelle: "Uniquement si demandeur accompagné" },
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
