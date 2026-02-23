import type React from "react";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

/**
 * Types pour la page des dossiers suivis de l'espace AMO
 */

/**
 * Dossier suivi (demande acceptée avec statut LOGEMENT_ELIGIBLE)
 */
export interface DossierSuivi {
  /** ID de la validation AMO (pour le lien vers la page détail) */
  id: string;
  /** Prénom du demandeur */
  prenom: string | null;
  /** Nom du demandeur */
  nom: string | null;
  /** Nom de la commune du logement */
  commune: string | null;
  /** Code département du logement */
  codeDepartement: string | null;
  /** Étape actuelle du parcours */
  etape: Step;
  /** Statut actuel du parcours */
  statut: Status;
  /** Statut DS du dossier de l'étape courante (si existe) */
  dsStatus: DSStatus | null;
  /** Date de validation de la demande (acceptation par l'AMO) */
  dateValidation: Date;
  /** Date du dernier changement de statut */
  dateDernierStatut: Date;
}

/**
 * Données pour la page des dossiers de l'espace AMO
 */
export interface AmoDossiersData {
  /** Nombre total de dossiers suivis (non archivés) */
  nombreDossiersSuivis: number;
  /** Nombre total de dossiers archivés */
  nombreDossiersArchives: number;
  /** Liste des dossiers suivis (non archivés) */
  dossiersSuivis: DossierSuivi[];
  /** Liste des dossiers archivés */
  dossiersArchives: DossierSuivi[];
}

/**
 * Labels des étapes du parcours
 */
export const STEP_LABELS: Record<Step, string> = {
  [Step.CHOIX_AMO]: "1. Sélection AMO",
  [Step.ELIGIBILITE]: "2. Formulaire d'éligibilité",
  [Step.DIAGNOSTIC]: "3. Diagnostic logement",
  [Step.DEVIS]: "4. Devis et accord",
  [Step.FACTURES]: "5. Factures",
};

/**
 * Calcule le texte de précision selon l'étape, le statut et le statut DS
 */
export function getPrecisionText(etape: Step, statut: Status, dsStatus: DSStatus | null): string {
  const lienDS = "demarches.numerique.gouv.fr";

  // Cas refusé DS (commun à toutes les étapes sauf CHOIX_AMO)
  if (dsStatus === DSStatus.REFUSE) {
    switch (etape) {
      case Step.ELIGIBILITE:
        return `Éligibilité refusée. Pour en savoir plus, le demandeur doit consulter sa messagerie sur ${lienDS}.`;
      case Step.DIAGNOSTIC:
        return `Le diagnostic a été refusé. Pour en savoir plus, le demandeur doit consulter sa messagerie sur ${lienDS}.`;
      case Step.DEVIS:
        return `Les devis ont été refusés. Pour en savoir plus, le demandeur doit consulter sa messagerie sur ${lienDS}.`;
      case Step.FACTURES:
        return `Les factures ont été refusées. Pour en savoir plus, le demandeur doit consulter sa messagerie sur ${lienDS}.`;
      default:
        return "";
    }
  }

  // Cas par étape et statut
  switch (etape) {
    case Step.CHOIX_AMO:
      return "Sélection AMO en cours.";

    case Step.ELIGIBILITE:
      if (statut === Status.TODO) {
        return "Le demandeur doit remplir et soumettre le formulaire d'éligibilité.";
      }
      if (statut === Status.EN_INSTRUCTION) {
        return "En instruction par la DDT.";
      }
      break;

    case Step.DIAGNOSTIC:
      if (statut === Status.TODO) {
        return "Éligibilité validée. Le demandeur doit transmettre le diagnostic réalisé.";
      }
      if (statut === Status.EN_INSTRUCTION) {
        return "En instruction par la DDT.";
      }
      break;

    case Step.DEVIS:
      if (statut === Status.TODO) {
        return "Diagnostic accepté. Le demandeur doit transmettre les devis pour accord avant travaux.";
      }
      if (statut === Status.EN_INSTRUCTION) {
        return "En instruction par la DDT.";
      }
      break;

    case Step.FACTURES:
      if (statut === Status.TODO) {
        return "Devis acceptés. Le demandeur doit transmettre les factures après travaux pour recevoir les aides.";
      }
      if (statut === Status.EN_INSTRUCTION) {
        return "En instruction par la DDT.";
      }
      if (statut === Status.VALIDE) {
        return "Factures acceptées. Paiement et clôture de la demande à venir.";
      }
      break;
  }

  return "";
}

/**
 * Variantes visuelles pour la cellule "Précisions"
 */
type PrecisionVariant = "en_construction" | "en_instruction" | "archive";

const PRECISION_COLORS: Record<PrecisionVariant, string> = {
  en_construction: "#feebd0",
  en_instruction: "#dae6fd",
  archive: "#dddddd",
};

/**
 * Détermine la variante visuelle de la cellule Précisions
 */
function getPrecisionVariant(statut: Status, isArchived: boolean): PrecisionVariant {
  if (isArchived) return "archive";
  if (statut === Status.EN_INSTRUCTION) return "en_instruction";
  return "en_construction";
}

/**
 * Retourne le style inline pour la cellule Précisions
 * (bordure gauche épaisse colorée selon le statut)
 */
export function getPrecisionStyle(statut: Status, isArchived: boolean): React.CSSProperties {
  const color = PRECISION_COLORS[getPrecisionVariant(statut, isArchived)];
  return {
    boxShadow: `inset 8px 0 0 0 ${color}`,
  };
}
