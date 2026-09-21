/**
 * Textes de l'écran de résultat partagés entre le rendu HTML (`CalloutExpertRga`,
 * `ComprendreSourcesVulnerabilite`) et le PDF téléchargeable (`VulnerabilitePdfDocument`),
 * pour que les deux rendus ne puissent pas diverger.
 */

export const CALLOUT_EXPERT_TITLE = "Comment réduire cette vulnérabilité ?";
export const CALLOUT_EXPERT_TEXT =
  "Ce simulateur donne une estimation simplifiée, pas un diagnostic. Pour évaluer précisément la vulnérabilité de " +
  "votre logement et prioriser les travaux, rapprochez-vous d'un expert RGA. C'est justement à cela que sert le " +
  "Fonds Prévention Argile : il peut financer ce diagnostic de vulnérabilité approfondi.";

export const SOURCES_VULNERABILITE_TITRE = "Comprendre les sources de vulnérabilité";
export const SOURCES_VULNERABILITE_INTRO =
  "Le retrait-gonflement des argiles (RGA) fragilise les maisons individuelles quand le sol argileux se rétracte " +
  "en période sèche puis regonfle avec l'humidité.";
export const SOURCES_VULNERABILITE_CHAPO = "Trois sources de vulnérabilité :";
export const SOURCES_VULNERABILITE_ITEMS: { label: string; texte: string }[] = [
  {
    label: "Le sol",
    texte: "l'aléa argileux de votre terrain — on ne peut pas agir dessus, les solutions ne sont pas encore éprouvées.",
  },
  {
    label: "Le bâtiment",
    texte: "notamment les fondations — des travaux efficaces mais coûteux, à réserver à un diagnostic d'expert.",
  },
  {
    label: "L'environnement proche",
    texte:
      "gestion de l'eau et de la végétation autour de la maison — c'est là que des gestes simples, à moindre " +
      "coût, ont le plus d'impact. C'est le cœur de ce simulateur.",
  },
];
