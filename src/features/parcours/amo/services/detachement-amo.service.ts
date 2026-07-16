import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  amoValidationTokens,
  entreprisesAmo,
  parcoursAmoValidations,
  parcoursPrevention,
} from "@/shared/database/schema";
import { ActionResult } from "@/shared/types/action-result.types";
import { Status, Step } from "../../core";
import { StatutValidationAmo } from "../domain/value-objects";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";

/** Statuts depuis lesquels un détachement est possible (tout sauf « déjà sans AMO »). */
const STATUTS_DETACHABLES = [
  StatutValidationAmo.EN_ATTENTE,
  StatutValidationAmo.LOGEMENT_ELIGIBLE,
  StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
  StatutValidationAmo.ACCOMPAGNEMENT_REFUSE,
];

export interface DetacherAmoParams {
  parcoursId: string;
}

export interface DetacherAmoResult {
  /** true si le parcours était encore à choix_amo et a été avancé à eligibilite/todo. */
  etapeAvancee: boolean;
  /** Entreprise AMO détachée (lue avant la mutation, pour notifier ensuite). */
  entrepriseAmoId: string | null;
  amoNom: string;
  amoEmails: string;
  demandeurNom: string;
  demandeurPrenom: string;
}

/**
 * Détache l'AMO d'un parcours et le bascule en « sans AMO » (le demandeur poursuit seul).
 *
 * Effet :
 *   - validation : statut -> SANS_AMO, entreprise détachée, attributionMode -> AUCUN,
 *     purge commentaire / valideeAt / mandataire financier / demande d'arrêt / tracking email
 *   - tokens AMO encore actifs -> invalidés (sinon l'AMO pourrait valider via son vieux lien)
 *   - étape : encore à choix_amo -> avance à eligibilite/todo ; au-delà -> inchangée
 *
 * Ne touche PAS `archived_at` : le dossier continue en autonomie, l'aller-vers du
 * territoire en devient le responsable (règle « sticky » relâchée sur SANS_AMO).
 *
 * Pur domaine : ne vérifie NI la session NI les permissions (la garde vit dans la
 * server action). Réutilisé par le script ops `detacher-amo.ts` et par l'UI.
 */
export async function detacherAmo(params: DetacherAmoParams): Promise<ActionResult<DetacherAmoResult>> {
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
    return { success: false, error: "Aucune validation AMO sur ce dossier" };
  }
  if (validation.statut === StatutValidationAmo.SANS_AMO && !validation.entrepriseAmoId) {
    return { success: false, error: "Ce parcours est déjà sans AMO" };
  }
  if (parcours.archivedAt) {
    return { success: false, error: "Parcours archivé : le désarchiver avant de détacher l'AMO" };
  }

  // Lu AVANT la mutation : après détachement, l'entreprise n'est plus rattachée.
  const [entreprise] = validation.entrepriseAmoId
    ? await db
        .select({ nom: entreprisesAmo.nom, emails: entreprisesAmo.emails })
        .from(entreprisesAmo)
        .where(eq(entreprisesAmo.id, validation.entrepriseAmoId))
        .limit(1)
    : [];

  const etapeAvancee = parcours.currentStep === Step.CHOIX_AMO;
  const now = new Date();

  await db.transaction(async (tx) => {
    // UPDATE conditionné sur le statut détachable : protège d'un changement concurrent.
    await tx
      .update(parcoursAmoValidations)
      .set({
        entrepriseAmoId: null,
        statut: StatutValidationAmo.SANS_AMO,
        attributionMode: AttributionAmoMode.AUCUN,
        commentaire: null,
        estMandataireFinancier: null,
        demandeArretAt: null,
        valideeAt: null,
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
        and(eq(parcoursAmoValidations.id, validation.id), inArray(parcoursAmoValidations.statut, STATUTS_DETACHABLES))
      );

    // Tue les liens email AMO encore actifs (sinon l'AMO pourrait valider après coup).
    await tx
      .update(amoValidationTokens)
      .set({ usedAt: now })
      .where(and(eq(amoValidationTokens.parcoursAmoValidationId, validation.id), isNull(amoValidationTokens.usedAt)));

    if (etapeAvancee) {
      await tx
        .update(parcoursPrevention)
        .set({ currentStep: Step.ELIGIBILITE, currentStatus: Status.TODO, updatedAt: now })
        .where(eq(parcoursPrevention.id, parcoursId));
    }
  });

  return {
    success: true,
    data: {
      etapeAvancee,
      entrepriseAmoId: validation.entrepriseAmoId,
      amoNom: entreprise?.nom ?? "",
      amoEmails: entreprise?.emails ?? "",
      demandeurNom: validation.userNom ?? "",
      demandeurPrenom: validation.userPrenom ?? "",
    },
  };
}
