import { Step } from "@/shared/domain/value-objects/step.enum";

/**
 * Tri des « préreremplis non déposés » pour le support (ADR-0026).
 *
 * Tous partagent le même constat — le formulaire n'a jamais été transmis — mais pas la même
 * suite à donner. On ne saura jamais si le brouillon est encore vivant côté DN : ces cas ne
 * décrivent donc pas l'état du dossier, ils décrivent **ce qu'il y a à faire**.
 */
export enum CasPrefill {
  /** Créé il y a quelques jours : il est peut-être en train de le remplir. */
  RECENT = "recent",
  /** Étape diagnostic : il attend son diagnostic, pas un lien. Délai métier normal. */
  ATTENTE_DIAGNOSTIC = "attente_diagnostic",
  /** Revenu sur FPA depuis, sans jamais déposer : il veut avancer et n'y arrive pas. */
  REVENU_SANS_DEPOSER = "revenu_sans_deposer",
  /** Ni dépôt ni retour depuis plus d'un mois. */
  SANS_NOUVELLES = "sans_nouvelles",
  /** Entre les deux : trop tôt pour conclure. */
  EN_COURS = "en_cours",
}

export const CAS_PREFILL_META: Record<
  CasPrefill,
  { label: string; aFaire: string; severity: "info" | "warning" | "success" }
> = {
  [CasPrefill.RECENT]: {
    label: "Trop tôt",
    aFaire: "Ne rien faire : le formulaire vient d'être ouvert, il est peut-être en cours de remplissage.",
    severity: "success",
  },
  [CasPrefill.ATTENTE_DIAGNOSTIC]: {
    label: "Attend son diagnostic",
    aFaire:
      "Le formulaire s'ouvre au clic, mais ne peut être transmis qu'une fois le diagnostic réalisé par un bureau d'études — plusieurs semaines. Suivre l'avancement du diagnostic, pas le formulaire.",
    severity: "info",
  },
  [CasPrefill.REVENU_SANS_DEPOSER]: {
    label: "Revenu sans déposer",
    aFaire:
      "Il est revenu sur son compte depuis, sans jamais transmettre : c'est le cas à traiter en priorité. L'appeler pour comprendre ce qui bloque, et réinitialiser son formulaire si besoin.",
    severity: "warning",
  },
  [CasPrefill.SANS_NOUVELLES]: {
    label: "Sans nouvelles",
    aFaire: "Ni dépôt ni retour depuis plus d'un mois : abandon probable. Une relance, sinon archiver.",
    severity: "info",
  },
  [CasPrefill.EN_COURS]: {
    label: "En cours",
    aFaire: "Trop tôt pour conclure : laisser venir encore quelques semaines.",
    severity: "info",
  },
};

/** Ordre d'affichage : ce qui demande une action d'abord. */
export const CAS_PREFILL_ORDRE: CasPrefill[] = [
  CasPrefill.REVENU_SANS_DEPOSER,
  CasPrefill.SANS_NOUVELLES,
  CasPrefill.EN_COURS,
  CasPrefill.ATTENTE_DIAGNOSTIC,
  CasPrefill.RECENT,
];

const JOURS_TROP_TOT = 7;
const JOURS_SANS_NOUVELLES = 30;

export interface EntreePourClassement {
  step: Step;
  /** Date de création du prérempli de l'étape courante. */
  prefillCreatedAt: Date | null;
  /** Dernière connexion du demandeur à FPA. */
  lastLogin: Date | null;
}

/**
 * Le diagnostic passe avant l'ancienneté : un formulaire de diagnostic ouvert depuis trois mois
 * n'est pas un abandon, c'est le temps qu'il faut pour faire réaliser un diagnostic.
 */
export function classerCasPrefill(entree: EntreePourClassement, maintenant: Date): CasPrefill {
  if (entree.step === Step.DIAGNOSTIC) return CasPrefill.ATTENTE_DIAGNOSTIC;
  if (!entree.prefillCreatedAt) return CasPrefill.EN_COURS;

  const jours = (maintenant.getTime() - entree.prefillCreatedAt.getTime()) / 86_400_000;
  if (jours < JOURS_TROP_TOT) return CasPrefill.RECENT;

  // Revenu APRÈS avoir ouvert son formulaire : l'intérêt est démontré par le comportement.
  if (entree.lastLogin && entree.lastLogin > entree.prefillCreatedAt) return CasPrefill.REVENU_SANS_DEPOSER;

  return jours >= JOURS_SANS_NOUVELLES ? CasPrefill.SANS_NOUVELLES : CasPrefill.EN_COURS;
}
