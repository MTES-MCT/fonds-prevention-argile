"use server";

import { getSession } from "@/features/auth/server";
import { userRepo } from "@/shared/database";
import type { ActionResult } from "@/shared/types";

interface ContactInfo {
  emailContact: string | null;
  telephone: string | null;
}

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
}): Promise<ActionResult<ContactInfo>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const updated = await userRepo.updateContactInfo(session.userId, {
      emailContact: params.emailContact.trim(),
      telephone: params.telephone.trim(),
    });

    if (!updated) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    return {
      success: true,
      data: {
        emailContact: updated.emailContact,
        telephone: updated.telephone,
      },
    };
  } catch (error) {
    console.error("Erreur updateContactInfo:", error);
    return { success: false, error: "Erreur interne" };
  }
}
