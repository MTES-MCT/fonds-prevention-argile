import type { PieceAide } from "./pieces-justificatives.types";

/**
 * Aide éditoriale « comment récupérer cette pièce ».
 *
 * DN fournit le libellé, la description et le modèle ; on ajoute par-dessus le
 * « où l'obtenir » (liens impots.gouv, contacter l'assureur…). Le rattachement se
 * fait par mots-clés sur le libellé DN normalisé (les libellés DN sont libres et
 * peuvent évoluer).
 *
 * L'ordre compte : première règle dont un mot-clé matche. Les règles les plus
 * spécifiques (assureur, mandat) passent avant les plus génériques (attestation).
 */
interface AideRule {
  keywords: string[];
  aide: PieceAide;
}

/** Normalise un libellé pour le matching : minuscules, sans accents, espaces compactés. */
export function normalizeLabel(label: string): string {
  return label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

const AIDE_RULES: AideRule[] = [
  {
    keywords: ["piece d'identite", "piece d identite", "piece d’identite"],
    aide: {
      texte: "Carte nationale d'identité ou passeport en cours de validité.",
    },
  },
  {
    keywords: ["avis d'imposition", "avis d imposition", "avis d’imposition"],
    aide: {
      texte:
        "Téléchargeable depuis votre espace particulier sur impots.gouv.fr (rubrique « Documents »).",
      liens: [{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/accueil" }],
    },
  },
  {
    keywords: ["justificatif de propriete", "taxe fonciere"],
    aide: {
    },
  },
  {
    keywords: ["releve d'identite bancaire", "releve d identite bancaire", "rib"],
    aide: {
      texte: "Disponible dans l'application ou l'espace bancaire en ligne.",
    },
  },
  {
    keywords: ["assurance habitation", "attestation d'assurance", "attestation d assurance"],
    aide: {
      texte: "À demander à votre assureur habitation (espace client ou conseiller).",
    },
  },
  {
    keywords: ["assureur", "catastrophe naturelle", "indemnisation"],
    aide: {
    },
  },
  {
    keywords: ["mandat", "cerfa"],
    aide: {
    },
  },
  {
    keywords: ["attestation sur l'honneur", "attestation sur l honneur", "attestation sur l’honneur"],
    aide: {
    },
  },
  {
    keywords: ["rapport", "diagnostic de vulnerabilite"],
    aide: {
      texte: "Remis par le professionnel (bureau d'études / expert) qui a réalisé le diagnostic.",
    },
  },
  {
    keywords: ["facture"],
    aide: {
      texte: "Facture acquittée établie par l'entreprise ou le prestataire.",
    },
  },
  {
    keywords: ["devis"],
    aide: {
      texte: "Établis par votre AMO ou les entreprises retenues.",
    },
  },
];

/** Renvoie l'aide éditoriale associée au libellé DN, ou undefined si aucune. */
export function findAideForLabel(label: string): PieceAide | undefined {
  const normalized = normalizeLabel(label);
  return AIDE_RULES.find((rule) => rule.keywords.some((kw) => normalized.includes(normalizeLabel(kw))))?.aide;
}
