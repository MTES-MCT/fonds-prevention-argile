import { db } from "@/shared/database/client";
import { users } from "@/shared/database/schema/users";
import { parcoursPrevention } from "@/shared/database/schema/parcours-prevention";
import { parcoursAmoValidations } from "@/shared/database/schema/parcours-amo-validations";
import { entreprisesAmo } from "@/shared/database/schema/entreprises-amo";
import { dossiersDemarchesSimplifiees } from "@/shared/database/schema/dossiers-demarches-simplifiees";
import { desc, eq } from "drizzle-orm";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { UserWithParcoursDetails, DossierInfo } from "../domain/types/user-with-parcours.types";
import { amoValidationTokens } from "@/shared/database";

/**
 * Service pour récupérer les utilisateurs avec tous les détails de leur parcours
 */

/**
 * Anonymise un nom en ne gardant que la première lettre suivie d'un point
 */
function anonymiserNom(nom: string | null): string | null {
  if (!nom || nom.length === 0) return null;
  return `${nom.charAt(0).toUpperCase()}.`;
}

/**
 * Récupère tous les utilisateurs avec leurs parcours, validations AMO et dossiers DS
 * Les données personnelles sont anonymisées côté serveur
 */
export async function getUsersWithParcours(): Promise<UserWithParcoursDetails[]> {
  // Requête principale avec tous les LEFT JOINs
  const results = await db
    .select({
      // User
      userId: users.id,
      userFcId: users.fcId,
      userEmail: users.email,
      userName: users.nom,
      userFirstName: users.prenom,
      userTelephone: users.telephone,
      userLastLogin: users.lastLogin,
      userCreatedAt: users.createdAt,
      userUpdatedAt: users.updatedAt,

      // Parcours
      parcoursId: parcoursPrevention.id,
      parcoursCurrentStep: parcoursPrevention.currentStep,
      parcoursCurrentStatus: parcoursPrevention.currentStatus,
      parcoursCreatedAt: parcoursPrevention.createdAt,
      parcoursUpdatedAt: parcoursPrevention.updatedAt,
      parcoursCompletedAt: parcoursPrevention.completedAt,
      parcoursRgaSimulationData: parcoursPrevention.rgaSimulationData,
      parcoursRgaSimulationCompletedAt: parcoursPrevention.rgaSimulationCompletedAt,
      parcoursRgaDataDeletedAt: parcoursPrevention.rgaDataDeletedAt,

      // Validation AMO
      validationId: parcoursAmoValidations.id,
      validationStatut: parcoursAmoValidations.statut,
      validationChoisieAt: parcoursAmoValidations.choisieAt,
      validationValideeAt: parcoursAmoValidations.valideeAt,
      validationCommentaire: parcoursAmoValidations.commentaire,
      validationUserPrenom: parcoursAmoValidations.userPrenom,
      validationUserNom: parcoursAmoValidations.userNom,
      validationUserEmail: parcoursAmoValidations.userEmail,
      validationUserTelephone: parcoursAmoValidations.userTelephone,
      validationAdresseLogement: parcoursAmoValidations.adresseLogement,

      // Tracking email Brevo
      validationBrevoMessageId: parcoursAmoValidations.brevoMessageId,
      validationEmailSentAt: parcoursAmoValidations.emailSentAt,
      validationEmailDeliveredAt: parcoursAmoValidations.emailDeliveredAt,
      validationEmailOpenedAt: parcoursAmoValidations.emailOpenedAt,
      validationEmailClickedAt: parcoursAmoValidations.emailClickedAt,
      validationEmailBounceType: parcoursAmoValidations.emailBounceType,
      validationEmailBounceReason: parcoursAmoValidations.emailBounceReason,

      // AMO
      amoId: entreprisesAmo.id,
      amoNom: entreprisesAmo.nom,
      amoSiret: entreprisesAmo.siret,
      amoAdresse: entreprisesAmo.adresse,
      amoEmails: entreprisesAmo.emails,
      amoTelephone: entreprisesAmo.telephone,

      // Token de validation AMO
      tokenId: amoValidationTokens.id,
      tokenValue: amoValidationTokens.token,
      tokenCreatedAt: amoValidationTokens.createdAt,
      tokenExpiresAt: amoValidationTokens.expiresAt,
      tokenUsedAt: amoValidationTokens.usedAt,

      // Dossier DS
      dossierId: dossiersDemarchesSimplifiees.id,
      dossierStep: dossiersDemarchesSimplifiees.step,
      dossierDsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dossierDsId: dossiersDemarchesSimplifiees.dsId,
      dossierDsStatus: dossiersDemarchesSimplifiees.dsStatus,
      dossierSubmittedAt: dossiersDemarchesSimplifiees.submittedAt,
      dossierProcessedAt: dossiersDemarchesSimplifiees.processedAt,
      dossierCreatedAt: dossiersDemarchesSimplifiees.createdAt,
      dossierUpdatedAt: dossiersDemarchesSimplifiees.updatedAt,
      dossierLastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
    })
    .from(users)
    .leftJoin(parcoursPrevention, eq(users.id, parcoursPrevention.userId))
    .leftJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .leftJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
    .leftJoin(amoValidationTokens, eq(parcoursAmoValidations.id, amoValidationTokens.parcoursAmoValidationId))
    .leftJoin(dossiersDemarchesSimplifiees, eq(parcoursPrevention.id, dossiersDemarchesSimplifiees.parcoursId))
    .orderBy(desc(users.createdAt));

  // Grouper les résultats par utilisateur
  const usersMap = new Map<string, UserWithParcoursDetails>();

  for (const row of results) {
    // Si l'utilisateur n'est pas encore dans la map
    if (!usersMap.has(row.userId)) {
      usersMap.set(row.userId, {
        user: {
          id: row.userId,
          fcId: row.userFcId,
          email: row.userEmail,
          // Anonymisation : Prénom + première lettre du nom
          name: anonymiserNom(row.userName),
          firstName: row.userFirstName,
          telephone: row.userTelephone,
          lastLogin: row.userLastLogin,
          createdAt: row.userCreatedAt,
          updatedAt: row.userUpdatedAt,
        },
        parcours: row.parcoursId
          ? {
              id: row.parcoursId,
              currentStep: row.parcoursCurrentStep!,
              currentStatus: row.parcoursCurrentStatus!,
              createdAt: row.parcoursCreatedAt!,
              updatedAt: row.parcoursUpdatedAt!,
              completedAt: row.parcoursCompletedAt,
              rgaSimulationCompletedAt: row.parcoursRgaSimulationCompletedAt,
              rgaDataDeletedAt: row.parcoursRgaDataDeletedAt,
            }
          : null,
        // Exposer rgaSimulationData complet pour les statistiques
        rgaSimulation: row.parcoursRgaSimulationData || null,
        amoValidation: row.validationId
          ? {
              id: row.validationId,
              statut: row.validationStatut!,
              choisieAt: row.validationChoisieAt!,
              valideeAt: row.validationValideeAt,
              commentaire: row.validationCommentaire,
              amo: {
                id: row.amoId!,
                nom: row.amoNom!,
                siret: row.amoSiret,
                adresse: row.amoAdresse,
                emails: row.amoEmails!,
                telephone: row.amoTelephone,
              },
              userData: {
                // Anonymisation : Prénom + première lettre du nom
                prenom: row.validationUserPrenom,
                nom: anonymiserNom(row.validationUserNom),
                email: row.validationUserEmail,
                telephone: row.validationUserTelephone,
                adresseLogement: row.validationAdresseLogement,
              },
              token: row.tokenId
                ? {
                    id: row.tokenId,
                    token: row.tokenValue!,
                    createdAt: row.tokenCreatedAt!,
                    expiresAt: row.tokenExpiresAt!,
                    usedAt: row.tokenUsedAt,
                  }
                : null,
              emailTracking: {
                brevoMessageId: row.validationBrevoMessageId,
                sentAt: row.validationEmailSentAt,
                deliveredAt: row.validationEmailDeliveredAt,
                openedAt: row.validationEmailOpenedAt,
                clickedAt: row.validationEmailClickedAt,
                bounceType: row.validationEmailBounceType as "hard" | "soft" | null,
                bounceReason: row.validationEmailBounceReason,
              },
            }
          : null,
        dossiers: {
          eligibilite: null,
          diagnostic: null,
          devis: null,
          factures: null,
        },
      });
    }

    // Ajouter le dossier si présent
    const userDetail = usersMap.get(row.userId)!;
    if (row.dossierId && row.dossierStep) {
      const dossierInfo: DossierInfo = {
        id: row.dossierId,
        dsNumber: row.dossierDsNumber,
        dsId: row.dossierDsId,
        dsStatus: row.dossierDsStatus!,
        submittedAt: row.dossierSubmittedAt,
        processedAt: row.dossierProcessedAt,
        createdAt: row.dossierCreatedAt!,
        updatedAt: row.dossierUpdatedAt!,
        lastSyncAt: row.dossierLastSyncAt,
      };

      // Affecter au bon step
      switch (row.dossierStep) {
        case Step.ELIGIBILITE:
          userDetail.dossiers.eligibilite = dossierInfo;
          break;
        case Step.DIAGNOSTIC:
          userDetail.dossiers.diagnostic = dossierInfo;
          break;
        case Step.DEVIS:
          userDetail.dossiers.devis = dossierInfo;
          break;
        case Step.FACTURES:
          userDetail.dossiers.factures = dossierInfo;
          break;
      }
    }
  }

  return Array.from(usersMap.values());
}
