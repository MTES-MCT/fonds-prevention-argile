import type { PieceAide } from "./pieces-justificatives.types";

/**
 * Aide éditoriale « comment récupérer cette pièce ».
 *
 * DN fournit le libellé, la description et le modèle ; on ajoute par-dessus le
 * « où l'obtenir » (liens impots.gouv, contacter l'assureur…). Le rattachement se
 * fait par mots-clés sur le libellé DN normalisé (les libellés DN sont libres et
 * peuvent évoluer) : première règle dont un mot-clé matche.
 *
 * Contenu volontairement conservateur (Lot 1) : on n'ajoute une aide que lorsqu'elle
 * est certaine. Le reste sera complété au Lot 2 (surface demandeur).
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
    keywords: ["avis d'imposition", "avis d imposition", "avis d’imposition"],
    aide: {
      texte:
        "Téléchargeable depuis votre espace particulier sur impots.gouv.fr (rubrique « Documents »). Un avis par foyer fiscal du logement.",
      liens: [{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/accueil" }],
    },
  },
  {
    keywords: ["justificatif de propriete", "taxe fonciere"],
    aide: {
      texte:
        "Acte de propriété (acte notarié) ou avis de taxe foncière. La taxe foncière est disponible dans votre espace impots.gouv.fr ; l'acte notarié auprès de votre notaire.",
      liens: [{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/accueil" }],
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
      texte:
        "Attestation à demander à votre assureur, indiquant votre situation vis-à-vis du régime des catastrophes naturelles.",
    },
  },
  {
    keywords: ["mandat", "cerfa"],
    aide: {
      texte:
        "Téléchargez le modèle ci-dessus, faites-le remplir et signer par le mandataire, puis joignez-le avec sa pièce d'identité.",
      liens: [
        {
          label: "CERFA mandat (service-public)",
          href: "https://www.formulaires.service-public.gouv.fr/gf/cerfa_17596.do",
        },
      ],
    },
  },
  {
    keywords: ["releve d'identite bancaire", "releve d identite bancaire", "rib"],
    aide: {
      texte: "Disponible dans votre application ou espace bancaire en ligne.",
    },
  },
];

/** Renvoie l'aide éditoriale associée au libellé DN, ou undefined si aucune. */
export function findAideForLabel(label: string): PieceAide | undefined {
  const normalized = normalizeLabel(label);
  return AIDE_RULES.find((rule) => rule.keywords.some((kw) => normalized.includes(normalizeLabel(kw))))?.aide;
}
