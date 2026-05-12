import type { AuthUser } from "@/features/auth/domain/entities";

/**
 * URL vers laquelle rediriger un agent après création d'un dossier via le wizard.
 *
 * Priorité AMO sur AV : si l'agent est rattaché à une entreprise AMO (qu'il
 * soit AMO pur ou AMO_ET_ALLERS_VERS), `createDossierByAgent` auto-crée une
 * `parcours_amo_validations` (statut EN_ATTENTE) qui claim le dossier sur cette
 * entreprise. Le dossier apparaît alors immédiatement dans `/espace-agent/dossiers`
 * et disparaît des prospects AV (la query prospect-list exclut les parcours
 * avec validation AMO).
 *
 * - AMO (ou AMO_ET_ALLERS_VERS) → `/espace-agent/dossiers` (visible dès création).
 * - Aller-vers pur → `/espace-agent/prospects` (visible immédiatement comme prospect).
 */
export function getPostCreationRedirectUrl(user: Pick<AuthUser, "allersVersId" | "entrepriseAmoId">): string {
  if (user.entrepriseAmoId) {
    return "/espace-agent/dossiers";
  }
  if (user.allersVersId) {
    return "/espace-agent/prospects";
  }
  return "/espace-agent/dossiers";
}
