"use server";

import { db } from "@/lib/database/client";
import { emailNotifications } from "@/lib/database/schema/email-notifications";
import { eq } from "drizzle-orm";
import type { ActionResult } from "../types";
import type { EmailNotification } from "@/lib/database/schema/email-notifications";
import { isValidEmail } from "@/lib/utils";
import { ROLES } from "@/lib/auth";
import { getSession } from "@/lib/auth/services/auth.service";

/**
 * Enregistre un email dans la table des notifications
 */
export async function enregistrerEmail(
  email: string
): Promise<ActionResult<{ email: string }>> {
  try {
    // Validation
    if (!email || email.trim() === "") {
      return {
        success: false,
        error: "L'email est obligatoire",
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return {
        success: false,
        error: "Le format de l'email est invalide",
      };
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.email, cleanEmail))
      .limit(1);

    if (existingEmail.length > 0) {
      return {
        success: false,
        error: "Cet email est déjà enregistré",
      };
    }

    // Insérer l'email
    await db.insert(emailNotifications).values({
      email: cleanEmail,
      departement: null,
    });

    return {
      success: true,
      data: { email: cleanEmail },
    };
  } catch (error) {
    console.error("Erreur enregistrerEmail:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'enregistrement",
    };
  }
}

/**
 * Liste tous les emails enregistrés (pour les admins)
 */
export async function listerEmails(): Promise<
  ActionResult<{ emails: EmailNotification[] }>
> {
  // Vérification du rôle admin
  const session = await getSession();

  if (!session?.userId || session.role !== ROLES.ADMIN) {
    return {
      success: false,
      error: "Accès non autorisé",
    };
  }

  try {
    const emails = await db
      .select()
      .from(emailNotifications)
      .orderBy(emailNotifications.createdAt);

    return {
      success: true,
      data: { emails },
    };
  } catch (error) {
    console.error("Erreur listerEmails:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des emails",
    };
  }
}
