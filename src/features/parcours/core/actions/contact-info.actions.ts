"use server";

import { z } from "zod";
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

const SOURCES_AVEC_PRECISION = [SourceAcquisition.AUTRE, SourceAcquisition.AMO, SourceAcquisition.ALLER_VERS];

const updateContactInfoSchema = z
  .object({
    emailContact: z.string().trim().toLowerCase().email("Adresse email invalide").max(254, "Email trop long"),
    telephone: z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, "Le numéro de téléphone doit contenir 10 chiffres"),
    sourceAcquisition: z.nativeEnum(SourceAcquisition).nullish(),
    sourceAcquisitionPrecision: z.string().trim().max(500, "Précision trop longue").nullish(),
  })
  .refine(
    (data) =>
      data.sourceAcquisition !== SourceAcquisition.AUTRE || (data.sourceAcquisitionPrecision?.length ?? 0) > 0,
    { message: "Veuillez préciser la source d'acquisition", path: ["sourceAcquisitionPrecision"] }
  );

type UpdateContactInfoInput = z.infer<typeof updateContactInfoSchema>;

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
export async function updateContactInfoAction(input: UpdateContactInfoInput): Promise<ActionResult<ContactInfo>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parsed = updateContactInfoSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Données invalides";
      return { success: false, error: firstError };
    }

    const { emailContact, telephone, sourceAcquisition, sourceAcquisitionPrecision } = parsed.data;

    // La précision n'est conservée que pour les sources qui l'autorisent
    const precision =
      sourceAcquisition && SOURCES_AVEC_PRECISION.includes(sourceAcquisition)
        ? sourceAcquisitionPrecision || null
        : null;

    const updated = await userRepo.updateContactInfo(session.userId, {
      emailContact,
      telephone,
      sourceAcquisition: sourceAcquisition ?? null,
      sourceAcquisitionPrecision: precision,
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
