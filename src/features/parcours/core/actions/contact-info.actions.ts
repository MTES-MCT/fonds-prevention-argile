"use server";

import { getSession } from "@/features/auth/server";
import { userRepo } from "@/shared/database";
import { SourceAcquisition } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";

interface ContactInfo {
  emailContact: string | null;
  telephone: string | null;
  sourceAcquisition: SourceAcquisition | null;
  sourceAcquisitionPrecision: string | null;
}

const SOURCE_ACQUISITION_VALUES = Object.values(SourceAcquisition) as string[];

/**
 * Récupère les coordonnées de contact de l'utilisateur
 */
export async function getContactInfo(): Promise<ActionResult<ContactInfo>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const user = await userRepo.findById(session.userId);
    if (!user) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    return {
      success: true,
      data: {
        emailContact: user.emailContact,
        telephone: user.telephone,
        sourceAcquisition: user.sourceAcquisition,
        sourceAcquisitionPrecision: user.sourceAcquisitionPrecision,
      },
    };
  } catch (error) {
    console.error("Erreur getContactInfo:", error);
    return { success: false, error: "Erreur interne" };
  }
}

/**
 * Met à jour les coordonnées de contact de l'utilisateur
 */
export async function updateContactInfoAction(params: {
  emailContact: string;
  telephone: string;
  sourceAcquisition?: string | null;
  sourceAcquisitionPrecision?: string | null;
}): Promise<ActionResult<ContactInfo>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    let sourceAcquisition: SourceAcquisition | null = null;
    if (params.sourceAcquisition) {
      if (!SOURCE_ACQUISITION_VALUES.includes(params.sourceAcquisition)) {
        return { success: false, error: "Source d'acquisition invalide" };
      }
      sourceAcquisition = params.sourceAcquisition as SourceAcquisition;
    }

    const precisionTrimmed = params.sourceAcquisitionPrecision?.trim() ?? "";
    if (sourceAcquisition === SourceAcquisition.AUTRE && !precisionTrimmed) {
      return { success: false, error: "Veuillez préciser la source d'acquisition" };
    }

    const SOURCES_AVEC_PRECISION = [SourceAcquisition.AUTRE, SourceAcquisition.AMO, SourceAcquisition.ALLER_VERS];
    const sourceAcquisitionPrecision = sourceAcquisition && SOURCES_AVEC_PRECISION.includes(sourceAcquisition)
      ? precisionTrimmed.slice(0, 500) || null
      : null;

    const updated = await userRepo.updateContactInfo(session.userId, {
      emailContact: params.emailContact.trim(),
      telephone: params.telephone.trim(),
      sourceAcquisition,
      sourceAcquisitionPrecision,
    });

    if (!updated) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    return {
      success: true,
      data: {
        emailContact: updated.emailContact,
        telephone: updated.telephone,
        sourceAcquisition: updated.sourceAcquisition,
        sourceAcquisitionPrecision: updated.sourceAcquisitionPrecision,
      },
    };
  } catch (error) {
    console.error("Erreur updateContactInfo:", error);
    return { success: false, error: "Erreur interne" };
  }
}
