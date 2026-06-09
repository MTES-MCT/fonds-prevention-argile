import { db } from "@/shared/database/client";
import {
  parcoursAmoValidations,
  parcoursPrevention,
  dossiersDemarchesSimplifiees,
  users,
} from "@/shared/database/schema";
import { eq, and } from "drizzle-orm";
import type { DossierDetail, InfoDemandeur, InfoLogement, ParcoursDateProgression } from "../domain/types";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { parseCoordinatesString } from "@/shared/utils/geo.utils";
import { calculateNiveauRevenuFromRga } from "@/features/simulateur/domain/types/rga-revenus.types";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";
import { dossierDemarchesSimplifieesRepository } from "@/shared/database/repositories/dossiers-demarches-simplifiees.repository";
import { buildAgentEditInfo } from "@/features/backoffice/espace-agent/shared/services/agent-edit-info.service";
import { getParcoursCreator } from "@/features/backoffice/espace-agent/shared/services/parcours-creator.service";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { STATUTS_CONSULTABLES } from "../domain/types";

/**
 * Récupère le détail d'un dossier suivi.
 * L'accès en lecture s'aligne sur la visibilité territoriale du listing :
 * tout agent du territoire (AMO, AV, hybride) peut consulter le dossier ;
 * les admins ont un accès global.
 */
export async function getDossierDetail(dossierId: string): Promise<ActionResult<DossierDetail>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // Récupérer le dossier avec les données du parcours
    const [dossier] = await db
      .select({
        validation: parcoursAmoValidations,
        parcours: parcoursPrevention,
        user: users,
      })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .innerJoin(users, eq(users.id, parcoursPrevention.userId))
      .where(eq(parcoursAmoValidations.id, dossierId))
      .limit(1);

    if (!dossier) {
      return { success: false, error: "Dossier non trouvé" };
    }

    // Page consultable pour les statuts SUIVIS + REFUSES + SANS_AMO (un dossier
    // archivé non éligible reste lisible pour voir le motif ; un dossier sans AMO
    // reste lisible car il progresse quand même dans le parcours).
    if (!STATUTS_CONSULTABLES.includes(dossier.validation.statut)) {
      return { success: false, error: "Ce dossier n'est pas consultable" };
    }

    // Contrôle d'accès aligné sur le listing : tout agent du territoire peut lire.
    // verifyProspectTerritoryAccess gère l'accès national (admins) et le match
    // EPCI ∪ département sur le scope de l'agent.
    const territoryError = await verifyProspectTerritoryAccess(dossier.validation.parcoursId, {
      id: user.agentId ?? "",
      role: user.role as UserRole,
      entrepriseAmoId: user.entrepriseAmoId ?? null,
      allersVersId: user.allersVersId ?? null,
    });
    if (territoryError) {
      return { success: false, error: territoryError };
    }

    // Récupérer le statut DS de l'étape courante
    const [dossierDS] = await db
      .select({ dsStatus: dossiersDemarchesSimplifiees.dsStatus })
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          eq(dossiersDemarchesSimplifiees.parcoursId, dossier.validation.parcoursId),
          eq(dossiersDemarchesSimplifiees.step, dossier.parcours.currentStep)
        )
      )
      .limit(1);

    // Construire l'objet InfoLogement à partir de RGASimulationData
    // Utiliser les données agent si disponibles, sinon les données initiales
    const rgaData = getEffectiveRGAData(dossier.parcours);

    // Construire l'objet InfoDemandeur
    const demandeur: InfoDemandeur = {
      prenom: dossier.validation.userPrenom || dossier.user.prenom,
      nom: dossier.validation.userNom || dossier.user.nom,
      nomFamille: dossier.user.nomFamille,
      email: dossier.validation.userEmail || dossier.user.emailContact || dossier.user.email,
      telephone: dossier.validation.userTelephone || dossier.user.telephone,
      adresse: rgaData?.logement?.adresse ?? dossier.validation.adresseLogement,
      sourceAcquisition: dossier.user.sourceAcquisition,
      sourceAcquisitionPrecision: dossier.user.sourceAcquisitionPrecision,
    };
    const coords = parseCoordinatesString(rgaData?.logement?.coordonnees);
    const niveauRevenu = calculateNiveauRevenuFromRga(rgaData);
    const logement: InfoLogement = {
      anneeConstruction: rgaData?.logement?.annee_de_construction || null,
      nombreNiveaux: rgaData?.logement?.niveaux?.toString() || null,
      etatMaison: rgaData?.rga?.sinistres || null,
      zoneExposition: rgaData?.logement?.zone_dexposition || null,
      indemnisationPasseeRGA: rgaData?.rga?.indemnise_indemnise_rga ?? null,
      indemnisationAvantJuillet2025: rgaData?.rga?.indemnise_avant_juillet_2025 ?? null,
      indemnisationAvantJuillet2015: rgaData?.rga?.indemnise_avant_juillet_2015 ?? null,
      montantIndemnisation: rgaData?.rga?.indemnise_montant_indemnite ?? null,
      nombreHabitants: rgaData?.menage?.personnes || null,
      niveauRevenu,
      codeInsee: rgaData?.logement?.commune || null,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      rnbId: rgaData?.logement?.rnb || null,
    };

    // Récupérer les dates de soumission et de traitement des dossiers DS par step
    const [datesByStep, processedDatesByStep] = await Promise.all([
      dossierDemarchesSimplifieesRepository.getSubmittedDatesByStep(dossier.parcours.id),
      dossierDemarchesSimplifieesRepository.getProcessedDatesByStep(dossier.parcours.id),
    ]);

    // Construire l'objet des dates de progression
    const dates: ParcoursDateProgression = {
      compteCreatedAt: dossier.parcours.createdAt,
      // Pas d'invitation envoyée si parcours archivé direct (sim non éligible).
      invitationSentAt:
        dossier.parcours.createdByAgentId && !dossier.parcours.archivedAt ? dossier.parcours.createdAt : undefined,
      invitationAcceptedAt: dossier.user.claimedAt ?? undefined,
      amoChoisieAt: dossier.validation.choisieAt,
      eligibiliteSubmittedAt: datesByStep.get(Step.ELIGIBILITE),
      diagnosticSubmittedAt: datesByStep.get(Step.DIAGNOSTIC),
      devisSubmittedAt: datesByStep.get(Step.DEVIS),
      facturesSubmittedAt: datesByStep.get(Step.FACTURES),
      eligibiliteProcessedAt: processedDatesByStep.get(Step.ELIGIBILITE),
      diagnosticProcessedAt: processedDatesByStep.get(Step.DIAGNOSTIC),
      devisProcessedAt: processedDatesByStep.get(Step.DEVIS),
      facturesProcessedAt: processedDatesByStep.get(Step.FACTURES),
    };

    // Construire les informations de diff agent + résolution agent invitant
    const [agentEditInfo, creator] = await Promise.all([
      buildAgentEditInfo(dossier.parcours),
      getParcoursCreator(dossier.parcours.createdByAgentId),
    ]);

    const dossierDetail: DossierDetail = {
      id: dossier.validation.id,
      parcoursId: dossier.parcours.id,
      demandeur,
      logement,
      currentStep: dossier.parcours.currentStep as Step,
      currentStatus: dossier.parcours.currentStatus as Status,
      dsStatus: dossierDS?.dsStatus ?? null,
      validationStatut: dossier.validation.statut,
      parcoursCreatedAt: dossier.parcours.createdAt,
      lastUpdatedAt: dossier.parcours.updatedAt,
      suiviDepuis: dossier.validation.valideeAt,
      dates,
      agentEditInfo,
      creator,
    };

    return { success: true, data: dossierDetail };
  } catch (error) {
    console.error("Erreur getDossierDetail:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du dossier",
    };
  }
}
