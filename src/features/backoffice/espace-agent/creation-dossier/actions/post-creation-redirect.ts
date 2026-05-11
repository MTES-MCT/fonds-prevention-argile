import type { AuthUser } from "@/features/auth/domain/entities";

/**
 * URL vers laquelle rediriger un agent après création d'un dossier via le wizard.
 *
 * - Aller-vers (ou AMO_ET_ALLERS_VERS) → liste des prospects, où le dossier
 *   fraîchement créé apparaît immédiatement (situation_particulier = 'prospect').
 * - AMO pur → liste des dossiers AMO. Note : le dossier n'apparaît dans cette
 *   liste qu'après validation AMO (`parcours_amo_validations`). En attendant,
 *   l'agent retombe sur sa page habituelle.
 */
export function getPostCreationRedirectUrl(user: Pick<AuthUser, "allersVersId" | "entrepriseAmoId">): string {
  if (user.allersVersId) {
    return "/espace-agent/prospects";
  }
  return "/espace-agent/dossiers";
}
