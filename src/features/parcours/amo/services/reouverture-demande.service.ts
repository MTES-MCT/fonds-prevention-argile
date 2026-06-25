import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  amoValidationTokens,
  entreprisesAmo,
  parcoursAmoValidations,
  parcoursPrevention,
} from "@/shared/database/schema";
import { ActionResult } from "@/shared/types/action-result.types";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { Status, Step } from "../../core";
import { AMO_VALIDATION_TOKEN_VALIDITY_DAYS, StatutValidationAmo } from "../domain/value-objects";
import { isValidationRefusee } from "../domain/value-objects/statutValidation";
import { normalizeCodeInsee } from "../utils/amo.utils";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";

/** Statuts depuis lesquels une ré-ouverture est possible (demande refusée par l'AMO). */
const STATUTS_REOUVRABLES = [StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE];

export interface ReouvrirDemandeParams {
  parcoursId: string;
  /** Renvoyer à l'AMO l'email de validation avec un lien frais (best-effort). */
  sendEmailToAmo?: boolean;
}

export interface ReouvrirDemandeResult {
  newToken: string;
  emailSent: boolean;
  amoNom: string;
  demandeurNom: string;
  demandeurPrenom: string;
}

/**
 * Ré-ouvre une demande refusée par l'AMO (« changement d'avis » du demandeur).
 *
 * Remet la validation AMO en attente — symétrique du refus (`rejectEligibility`) :
 *   - validation : statut refusé -> EN_ATTENTE, reset valideeAt/commentaire/tracking email
 *   - parcours   : situation -> PROSPECT, archived* -> NULL, currentStatus -> EN_INSTRUCTION
 *   - nouveau token de validation (90 j) pour que l'AMO puisse re-valider
 *   - email AMO optionnel (best-effort, nécessite un code INSEE demandeur ou agent)
 *
 * Pur domaine : ne vérifie NI la session NI les permissions (la garde vit dans la
 * server action). Réutilisé par le script ops `reouvrir-demande.ts` et par l'UI.
 */
export async function reouvrirDemandeRefusee(
  params: ReouvrirDemandeParams
): Promise<ActionResult<ReouvrirDemandeResult>> {
  const { parcoursId, sendEmailToAmo = false } = params;

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
    return { success: false, error: "Aucune validation AMO sur ce dossier" };
  }
  if (!isValidationRefusee(validation.statut)) {
    return { success: false, error: `La demande n'est pas refusée (statut « ${validation.statut} »)` };
  }
  if (parcours.currentStep !== Step.CHOIX_AMO) {
    return {
      success: false,
      error: `Étape inattendue (« ${parcours.currentStep} ») : intervention manuelle requise`,
    };
  }
  if (!validation.entrepriseAmoId) {
    return { success: false, error: "Aucune entreprise AMO rattachée à la demande" };
  }

  // Code INSEE pour l'email : simulation demandeur puis agent (fallback).
  const codeInsee =
    normalizeCodeInsee(parcours.rgaSimulationData?.logement?.commune) ??
    normalizeCodeInsee(parcours.rgaSimulationDataAgent?.logement?.commune);

  const now = new Date();
  const newToken = randomUUID();
  const expiresAt = new Date(now.getTime() + AMO_VALIDATION_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    // Désarchivage éventuel (no-op si déjà propre) + retour en attente AMO.
    await tx
      .update(parcoursPrevention)
      .set({
        situationParticulier: SituationParticulier.PROSPECT,
        archivedAt: null,
        archiveReason: null,
        archivedBy: null,
        currentStatus: Status.EN_INSTRUCTION,
        updatedAt: now,
      })
      .where(eq(parcoursPrevention.id, parcoursId));

    // UPDATE conditionné sur le statut refusé : protège d'un changement concurrent.
    await tx
      .update(parcoursAmoValidations)
      .set({
        statut: StatutValidationAmo.EN_ATTENTE,
        choisieAt: now,
        valideeAt: null,
        commentaire: null,
        brevoMessageId: null,
        emailSentAt: null,
        emailDeliveredAt: null,
        emailOpenedAt: null,
        emailClickedAt: null,
        emailBounceType: null,
        emailBounceReason: null,
        updatedAt: now,
      })
      .where(
        and(eq(parcoursAmoValidations.id, validation.id), inArray(parcoursAmoValidations.statut, STATUTS_REOUVRABLES))
      );

    await tx.insert(amoValidationTokens).values({
      parcoursAmoValidationId: validation.id,
      token: newToken,
      expiresAt,
    });
  });

  const [entreprise] = await db
    .select({ nom: entreprisesAmo.nom, emails: entreprisesAmo.emails })
    .from(entreprisesAmo)
    .where(eq(entreprisesAmo.id, validation.entrepriseAmoId))
    .limit(1);

  let emailSent = false;
  if (sendEmailToAmo && codeInsee && entreprise) {
    const emailsList = entreprise.emails
      .split(";")
      .map((e) => e.trim())
      .filter(Boolean);
    const res = await sendValidationAmoEmail({
      amoEmail: emailsList,
      amoNom: entreprise.nom,
      demandeurNom: validation.userNom ?? "",
      demandeurPrenom: validation.userPrenom ?? "",
      demandeurCodeInsee: codeInsee,
      adresseLogement: validation.adresseLogement ?? "",
      token: newToken,
    });
    if (res.success) {
      emailSent = true;
      await db
        .update(parcoursAmoValidations)
        .set({ brevoMessageId: res.data?.messageId ?? null, emailSentAt: new Date() })
        .where(eq(parcoursAmoValidations.id, validation.id));
    } else {
      console.error(`[reouvrirDemandeRefusee] échec envoi email AMO parcours=${parcoursId}: ${res.error}`);
    }
  }

  return {
    success: true,
    data: {
      newToken,
      emailSent,
      amoNom: entreprise?.nom ?? "",
      demandeurNom: validation.userNom ?? "",
      demandeurPrenom: validation.userPrenom ?? "",
    },
  };
}
