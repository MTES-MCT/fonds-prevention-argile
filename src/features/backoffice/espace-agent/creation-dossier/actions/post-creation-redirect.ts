import type { AuthUser } from "@/features/auth/domain/entities";

/**
 * URL vers laquelle rediriger un agent après création d'un dossier via le wizard.
 *
 * Le choix dépend de l'`intent` du wizard (provenance) :
 * - `av` (entrée depuis /prospects) → toujours `/espace-agent/prospects`
 *   (le dossier reste un prospect, pas de claim AMO).
 * - `amo` (entrée depuis /dossiers, défaut) → `/espace-agent/dossiers` si
 *   l'agent a un `entrepriseAmoId` (le dossier est claim sur cette entreprise),
 *   sinon `/espace-agent/prospects` (cas dégénéré : AV pur qui forge l'URL).
 */
export function getPostCreationRedirectUrl(
  user: Pick<AuthUser, "allersVersId" | "entrepriseAmoId">,
  intent: "amo" | "av" = "amo"
): string {
  if (intent === "av") {
    return "/espace-agent/prospects";
  }
  if (user.entrepriseAmoId) {
    return "/espace-agent/dossiers";
  }
  return "/espace-agent/prospects";
}
