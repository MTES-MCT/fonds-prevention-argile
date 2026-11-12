import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

export interface DossierAOuvrir {
  parcoursId: string;
  archivedAt: Date | null;
  validation: { id: string; statut: StatutValidationAmo; entrepriseAmoId: string | null } | null;
}

/** Fiche où s'ouvre un dossier : prospect sans validation, demande à trancher par l'AMO, sinon dossier suivi. */
export function cheminEspaceAgent({ parcoursId, archivedAt, validation }: DossierAOuvrir): string {
  if (!validation) return ROUTES.backoffice.espaceAgent.prospect(parcoursId);

  const estDemandeEnAttente =
    validation.statut === StatutValidationAmo.EN_ATTENTE && !!validation.entrepriseAmoId && !archivedAt;

  return estDemandeEnAttente
    ? ROUTES.backoffice.espaceAgent.demande(validation.id)
    : ROUTES.backoffice.espaceAgent.dossier(validation.id);
}
