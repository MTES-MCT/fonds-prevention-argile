import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { entreprisesAmo, parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { ActionResult } from "@/shared/types/action-result.types";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "../../core";
import { getDossierByStep } from "../../dossiers-ds/services/dossier-ds.service";
import { StatutValidationAmo, peutAnnulerAccompagnement, requiertAccordAmo } from "../domain/value-objects";
import { validateEmailsList } from "../utils/amo.utils";
import {
  sendArretAccompagnementInfoEmail,
  sendArretAccompagnementValidationEmail,
} from "@/shared/email/actions/send-arret-accompagnement.actions";
import { detacherAmo } from "./detachement-amo.service";

/** `detache` = arrêt immédiat ; `demande_enregistree` = en attente de l'accord AMO. */
export type ArretAccompagnementOutcome = "detache" | "demande_enregistree";

export interface AnnulerAccompagnementResult {
  outcome: ArretAccompagnementOutcome;
  amoNom: string;
  demandeurPrenom: string;
  demandeurNom: string;
}

/**
 * L'AMO mandataire refuse la demande d'arrêt : elle poursuit l'accompagnement.
 * Efface simplement la demande en attente — le dossier reste inchangé par ailleurs.
 *
 * Pur domaine : la garde (responsable du dossier) vit dans la server action.
 */
export async function refuserDemandeArret(params: {
  parcoursId: string;
}): Promise<ActionResult<{ demandeurPrenom: string; demandeurNom: string }>> {
  const { parcoursId } = params;

  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);
  if (!validation) {
    return { success: false, error: "Aucune validation AMO sur ce dossier" };
  }
  if (!validation.demandeArretAt) {
    return { success: false, error: "Aucune demande d'arrêt en attente sur ce dossier" };
  }

  await db
    .update(parcoursAmoValidations)
    .set({ demandeArretAt: null, updatedAt: new Date() })
    .where(eq(parcoursAmoValidations.id, validation.id));

  return {
    success: true,
    data: { demandeurPrenom: validation.userPrenom ?? "", demandeurNom: validation.userNom ?? "" },
  };
}

/**
 * Annulation de l'accompagnement à l'initiative du demandeur.
 *
 * Deux issues, selon l'engagement de l'AMO :
 *   - AMO non mandataire (ou pas encore validante) -> détachement immédiat + mail d'info
 *   - AMO mandataire ayant validé -> demande d'accord enregistrée + mail de validation
 *
 * Pur domaine : ne vérifie NI la session NI les permissions. L'appelant garantit que le
 * `parcoursId` est bien celui du demandeur connecté (résolution par `userId`).
 */
export async function annulerAccompagnementDemandeur(params: {
  parcoursId: string;
}): Promise<ActionResult<AnnulerAccompagnementResult>> {
  const { parcoursId } = params;

  const [parcours] = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, parcoursId)).limit(1);
  if (!parcours) {
    return { success: false, error: "Parcours introuvable" };
  }

  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);
  if (!validation) {
    return { success: false, error: "Aucun accompagnement à annuler" };
  }
  if (validation.statut === StatutValidationAmo.SANS_AMO) {
    return { success: false, error: "Vous gérez déjà vos démarches en autonomie" };
  }

  const dossierEligibilite = await getDossierByStep(parcoursId, Step.ELIGIBILITE);
  const eligibiliteDsStatus = (dossierEligibilite?.dsStatus as DSStatus | null) ?? null;

  if (
    !peutAnnulerAccompagnement({
      statut: validation.statut,
      demandeArretAt: validation.demandeArretAt,
      eligibiliteDsStatus,
    })
  ) {
    if (validation.demandeArretAt) {
      return { success: false, error: "Votre demande est déjà en attente de la réponse de votre AMO" };
    }
    if (eligibiliteDsStatus === DSStatus.EN_INSTRUCTION) {
      return {
        success: false,
        error: "Votre formulaire d'éligibilité est en cours d'instruction : l'accompagnement ne peut plus être modifié",
      };
    }
    return { success: false, error: "Votre accompagnement ne peut pas être annulé à ce stade" };
  }

  const demandeurPrenom = validation.userPrenom ?? "";
  const demandeurNom = validation.userNom ?? "";

  // --- Cas 1 : accord de l'AMO mandataire requis -> on enregistre la demande ---
  if (requiertAccordAmo(validation.statut, validation.estMandataireFinancier)) {
    const now = new Date();

    // Conditionné sur demande_arret_at IS NULL : protège d'un double clic concurrent.
    await db
      .update(parcoursAmoValidations)
      .set({ demandeArretAt: now, updatedAt: now })
      .where(and(eq(parcoursAmoValidations.id, validation.id), isNull(parcoursAmoValidations.demandeArretAt)));

    const [entreprise] = validation.entrepriseAmoId
      ? await db
          .select({ nom: entreprisesAmo.nom, emails: entreprisesAmo.emails })
          .from(entreprisesAmo)
          .where(eq(entreprisesAmo.id, validation.entrepriseAmoId))
          .limit(1)
      : [];

    // Envoi best-effort : la demande est enregistrée même si le mail échoue.
    if (entreprise) {
      const res = await sendArretAccompagnementValidationEmail({
        amoEmail: validateEmailsList(entreprise.emails),
        demandeurPrenom,
        demandeurNom,
        validationId: validation.id,
      });
      if (!res.success) {
        console.error(`[annulerAccompagnementDemandeur] échec envoi email AMO parcours=${parcoursId}: ${res.error}`);
      }
    }

    return {
      success: true,
      data: { outcome: "demande_enregistree", amoNom: entreprise?.nom ?? "", demandeurPrenom, demandeurNom },
    };
  }

  // --- Cas 2 : arrêt immédiat ---
  const detach = await detacherAmo({ parcoursId });
  if (!detach.success) {
    return { success: false, error: detach.error };
  }

  if (detach.data.amoEmails) {
    const res = await sendArretAccompagnementInfoEmail({
      amoEmail: validateEmailsList(detach.data.amoEmails),
      demandeurPrenom,
      demandeurNom,
    });
    if (!res.success) {
      console.error(`[annulerAccompagnementDemandeur] échec envoi email AMO parcours=${parcoursId}: ${res.error}`);
    }
  }

  return {
    success: true,
    data: { outcome: "detache", amoNom: detach.data.amoNom, demandeurPrenom, demandeurNom },
  };
}
