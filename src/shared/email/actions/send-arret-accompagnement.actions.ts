"use server";

import { getServerEnv } from "@/shared/config/env.config";
import { ActionResult } from "@/shared/types";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { renderEmailTemplate } from "../utils/render-template.utils";
import { ArretAccompagnementInfoTemplate } from "../templates/arret-accompagnement-info.template";
import { ArretAccompagnementValidationTemplate } from "../templates/arret-accompagnement-validation.template";
import { emailService } from "../services/email.service";

const SUBJECT = "Annulation d'un accompagnement";

interface ArretEmailParams {
  amoEmail: string | string[];
  demandeurPrenom: string;
  demandeurNom: string;
}

/**
 * Informe l'AMO non mandataire que le demandeur est passé en autonomie (fait accompli).
 *
 * Le lien pointe sur le listing et non sur le dossier : l'AMO vient d'être détachée,
 * elle n'a plus accès au détail (`canAccessDossier` refuse un dossier sans entreprise).
 */
export async function sendArretAccompagnementInfoEmail(
  params: ArretEmailParams
): Promise<ActionResult<{ messageId?: string }>> {
  try {
    const { amoEmail, demandeurPrenom, demandeurNom } = params;
    const lienDossier = `${getServerEnv().BASE_URL}${ROUTES.backoffice.espaceAmo.dossiers}`;

    const html = await renderEmailTemplate(
      ArretAccompagnementInfoTemplate({ demandeurPrenom, demandeurNom, lienDossier })
    );

    const result = await emailService.sendEmail({ to: amoEmail, subject: SUBJECT, html });
    if (!result.success) {
      return { success: false, error: result.error || "Erreur lors de l'envoi de l'email" };
    }
    return { success: true, data: { messageId: result.messageId } };
  } catch (error) {
    console.error("Erreur sendArretAccompagnementInfoEmail:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'email" };
  }
}

/**
 * Demande à l'AMO mandataire financier de se prononcer sur l'arrêt de l'accompagnement.
 * Le lien pointe sur le détail du dossier : l'AMO y a encore accès (pas encore détachée).
 */
export async function sendArretAccompagnementValidationEmail(
  params: ArretEmailParams & { validationId: string }
): Promise<ActionResult<{ messageId?: string }>> {
  try {
    const { amoEmail, demandeurPrenom, demandeurNom, validationId } = params;
    const lienDossier = `${getServerEnv().BASE_URL}${ROUTES.backoffice.espaceAmo.dossier(validationId)}`;

    const html = await renderEmailTemplate(
      ArretAccompagnementValidationTemplate({ demandeurPrenom, demandeurNom, lienDossier })
    );

    const result = await emailService.sendEmail({ to: amoEmail, subject: SUBJECT, html });
    if (!result.success) {
      return { success: false, error: result.error || "Erreur lors de l'envoi de l'email" };
    }
    return { success: true, data: { messageId: result.messageId } };
  } catch (error) {
    console.error("Erreur sendArretAccompagnementValidationEmail:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'email" };
  }
}
