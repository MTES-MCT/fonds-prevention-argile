/**
 * Types de l'inspection d'un dossier DN orphelin (ADR-0027).
 *
 * Isolés du service : celui-ci importe le client Postgres, qu'un composant client ne peut pas
 * charger. Ce module ne dépend de rien et traverse donc la frontière serveur/client.
 */

/** Ce qui a fait correspondre un demandeur, du plus fiable au moins fiable. */
export type MotifRapprochement = "adresse_logement" | "telephone" | "email" | "nom_prenom";

export const MOTIF_LABELS: Record<MotifRapprochement, string> = {
  adresse_logement: "même adresse de logement",
  telephone: "même téléphone",
  email: "même adresse e-mail",
  nom_prenom: "mêmes nom et prénom",
};

export interface CandidatDemandeur {
  parcoursId: string;
  userId: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  currentStep: string;
  adresse: string | null;
  motifs: MotifRapprochement[];
}

export interface InspectionDossier {
  dn: {
    number: number;
    state: string;
    dateDepot?: string;
    emailUsager: string | null;
    nomDeclare: string | null;
    prenomDeclare: string | null;
    deposeParUnTiers: boolean;
    mandataire: string | null;
    /** Champs du formulaire non vides, tels que DN les renvoie. */
    champs: Array<{ label: string; valeur: string }>;
  };
  candidats: CandidatDemandeur[];
}
