import type { PieceCategorie, PieceCondition } from "./pieces-justificatives.types";

interface PieceRegle {
  keywords: string[];
  categorie: PieceCategorie;
  condition?: PieceCondition;
}

export interface ClassementPiece {
  categorie: PieceCategorie;
  condition?: PieceCondition;
}

/** Normalise un libellé pour le matching : minuscules, sans accents, apostrophes droites, espaces compactés. */
export function normalizeLabel(label: string): string {
  return label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

// Première règle qui matche : les plus spécifiques d'abord (« autres financeurs » contient « assureurs »).
const REGLES: PieceRegle[] = [
  {
    keywords: ["autres financeurs"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Uniquement si d'autres financeurs interviennent" },
  },
  { keywords: ["assurance habitation", "attestation d'assurance"], categorie: "ASSURANCE" },
  { keywords: ["assureur", "sinistralite"], categorie: "ASSURANCE" },
  // Avant la règle du rapport : le libellé cite aussi « diagnostic de vulnérabilité ».
  { keywords: ["expert en rga"], categorie: "AMO_EXPERT" },
  { keywords: ["rapport", "diagnostic de vulnerabilite"], categorie: "AMO_EXPERT" },
  {
    keywords: ["cerfa", "mandataire de gestion"],
    categorie: "AMO_EXPERT",
    condition: { libelle: "Uniquement si demandeur accompagné" },
  },
  {
    keywords: ["bancaire du mandataire"],
    categorie: "AMO_EXPERT",
    condition: { libelle: "Uniquement si AMO mandataire financier" },
  },
  {
    keywords: ["releve d'identite bancaire"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Sauf si AMO mandataire financier" },
  },
  { keywords: ["devis pour la phase etude"], categorie: "AMO_EXPERT" },
  { keywords: ["facture"], categorie: "AMO_EXPERT" },
  { keywords: ["catastrophe naturelle", "indemnisation"], categorie: "ASSURANCE" },
  {
    keywords: ["indivision"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Obligatoire uniquement si indivision" },
  },
  // DN écrit « Attestion » : on vise le fragment qui distingue la pièce, pas sa formule d'ouverture.
  {
    keywords: ["15 ans"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Uniquement sans document officiel indiquant l'année de construction" },
  },
  {
    keywords: ["representant legal"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Uniquement si représentant légal" },
  },
  { keywords: ["piece d'identite"], categorie: "DEMANDEUR" },
  { keywords: ["avis d'imposition", "avis de situation declarative"], categorie: "DEMANDEUR" },
  { keywords: ["justificatif de propriete", "acte de propriete", "taxe fonciere"], categorie: "DEMANDEUR" },
];

/** Catégorie et condition d'une pièce d'après son libellé DN ; inconnue → « Autres pièces ». */
export function classerPiece(label: string): ClassementPiece {
  const normalized = normalizeLabel(label);
  const regle = REGLES.find((r) => r.keywords.some((kw) => normalized.includes(normalizeLabel(kw))));
  if (!regle) return { categorie: "AUTRES" };
  return { categorie: regle.categorie, condition: regle.condition };
}
