// Un compte FranceConnect ne se rattache qu'à un seul dossier : un doublon d'email est sans issue.
export type MotifDoublon = "compte" | "invitation" | "adresse";

export interface DoublonDemandeur {
  motif: MotifDoublon;
  message: string;
  /** Chemin du dossier existant dans l'espace agent, seulement s'il est dans le périmètre de l'agent. */
  lien: string | null;
}

const MESSAGES: Record<MotifDoublon, string> = {
  compte:
    "Ce demandeur a déjà un compte avec cette adresse email. Il doit se connecter avec FranceConnect : un nouveau dossier ne pourrait pas être rattaché à son compte.",
  invitation:
    "Un dossier attend déjà que ce demandeur se connecte avec cette adresse email. Renvoyez-lui l'invitation depuis ce dossier plutôt que d'en créer un nouveau.",
  adresse:
    "Un dossier existe déjà pour ce logement. S'il s'agit du même demandeur, reprenez ce dossier : un second ne pourrait pas être rattaché à son compte.",
};

const HORS_PERIMETRE = "Ce dossier n'est pas dans votre liste : contactez l'équipe du Fonds Prévention Argile.";

/** Seule l'adresse se contourne : deux propriétaires successifs peuvent partager un logement. */
export const estDoublonBloquant = (motif: MotifDoublon): boolean => motif !== "adresse";

export function presenterDoublon(motif: MotifDoublon, lien: string | null): DoublonDemandeur {
  return { motif, lien, message: lien ? MESSAGES[motif] : `${MESSAGES[motif]} ${HORS_PERIMETRE}` };
}
