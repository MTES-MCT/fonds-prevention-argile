import type { PieceAide, PieceCategorie, PieceCondition } from "./pieces-justificatives.types";

interface PieceRegle {
  keywords: string[];
  categorie: PieceCategorie;
  condition?: PieceCondition;
  aide?: PieceAide;
}

export interface ClassementPiece {
  categorie: PieceCategorie;
  condition?: PieceCondition;
  aide?: PieceAide;
}

/** Normalise un libellé pour le matching : minuscules, sans accents, apostrophes droites, espaces compactés. */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SI_ACCOMPAGNE: PieceCondition = { libelle: "Uniquement si demandeur accompagné" };

const AIDE_IDENTITE: PieceAide = { texte: "Carte nationale d'identité ou passeport en cours de validité." };
const AIDE_RIB: PieceAide = { texte: "Disponible dans l'application ou l'espace bancaire en ligne." };
const AIDE_DEVIS: PieceAide = { texte: "Établis par votre AMO ou les entreprises retenues." };

// Première règle qui matche : les plus spécifiques d'abord (« autres financeurs » contient « assureurs »).
const REGLES: PieceRegle[] = [
  {
    keywords: ["autres financeurs"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Uniquement si d'autres financeurs interviennent" },
  },
  {
    keywords: ["assurance habitation", "attestation d'assurance"],
    categorie: "ASSUREUR",
    condition: { libelle: "Uniquement si la maison est assurée" },
    aide: { texte: "À demander à votre assureur habitation (espace client ou conseiller)." },
  },
  { keywords: ["assureur", "sinistralite"], categorie: "ASSUREUR" },
  // Avant la règle du rapport : le libellé cite aussi « diagnostic de vulnérabilité ».
  { keywords: ["expert en rga"], categorie: "AMO_EXPERT" },
  {
    keywords: ["rapport", "diagnostic de vulnerabilite"],
    categorie: "AMO_EXPERT",
    aide: { texte: "Remis par le professionnel (bureau d'études / expert) qui a réalisé le diagnostic." },
  },
  { keywords: ["cerfa", "mandataire de gestion"], categorie: "AMO_EXPERT", condition: SI_ACCOMPAGNE },
  {
    keywords: ["bancaire du mandataire"],
    categorie: "AMO_EXPERT",
    condition: { libelle: "Uniquement si AMO mandataire financier" },
    aide: AIDE_RIB,
  },
  {
    keywords: ["releve d'identite bancaire"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Sauf si AMO mandataire financier" },
    aide: AIDE_RIB,
  },
  { keywords: ["devis pour la phase etude"], categorie: "AMO_EXPERT", condition: SI_ACCOMPAGNE, aide: AIDE_DEVIS },
  {
    keywords: ["facture"],
    categorie: "AMO_EXPERT",
    aide: { texte: "Facture acquittée établie par l'entreprise ou le prestataire." },
  },
  // Devis des travaux, maîtrise d'œuvre : ni AMO ni expert.
  { keywords: ["devis"], categorie: "AUTRES", aide: AIDE_DEVIS },
  { keywords: ["catastrophe naturelle", "indemnisation"], categorie: "DEMANDEUR" },
  {
    keywords: ["indivision"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Obligatoire uniquement si indivision" },
  },
  // DN écrit « Attestion » : on vise le fragment qui distingue la pièce, pas sa formule d'ouverture.
  {
    keywords: ["15 ans"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Uniquement sans justificatif de l'année de construction" },
  },
  {
    keywords: ["representant legal"],
    categorie: "DEMANDEUR",
    condition: { libelle: "Uniquement si représentant légal" },
    aide: AIDE_IDENTITE,
  },
  { keywords: ["piece d'identite"], categorie: "DEMANDEUR", aide: AIDE_IDENTITE },
  {
    keywords: ["avis d'imposition", "avis de situation declarative"],
    categorie: "DEMANDEUR",
    aide: {
      texte: "Téléchargeable depuis votre espace particulier sur impots.gouv.fr (rubrique « Documents »).",
      liens: [{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/accueil" }],
    },
  },
  { keywords: ["justificatif de propriete", "acte de propriete", "taxe fonciere"], categorie: "DEMANDEUR" },
];

/** Catégorie, condition et aide d'une pièce d'après son libellé DN ; inconnue → « Autres pièces ». */
export function classerPiece(label: string): ClassementPiece {
  const normalized = normalizeLabel(label);
  const regle = REGLES.find((r) => r.keywords.some((kw) => normalized.includes(normalizeLabel(kw))));
  if (!regle) return { categorie: "AUTRES" };
  return { categorie: regle.categorie, condition: regle.condition, aide: regle.aide };
}
