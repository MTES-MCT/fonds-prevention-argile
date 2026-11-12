"use server";

import { z } from "zod";
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import type { ActionResult } from "@/shared/types";
import { desactiverExpert, reactiverExpert, RefusOperationExpert } from "../services/experts-admin.service";

const idSchema = z.string().uuid("Identifiant invalide");

function erreur(error: unknown, contexte: string): { success: false; error: string } {
  if (error instanceof RefusOperationExpert) return { success: false, error: error.message };
  console.error(`[${contexte}]`, error instanceof Error ? error.name : "erreur inconnue");
  return { success: false, error: "Erreur inattendue, l'opération n'a pas été enregistrée" };
}

export async function desactiverExpertAction(input: unknown): Promise<ActionResult<void>> {
  const acces = await checkBackofficePermission(BackofficePermission.EXPERTS_WRITE);
  if (!acces.hasAccess) return { success: false, error: "Réservé au super-administrateur" };
  const saisie = z
    .object({ id: idSchema, raison: z.string().trim().min(1, "La raison est obligatoire").max(500) })
    .safeParse(input);
  if (!saisie.success) return { success: false, error: saisie.error.issues[0].message };
  try {
    await desactiverExpert(saisie.data.id, acces.user?.agentId ?? null, saisie.data.raison);
    console.info(`[experts] Expert ${saisie.data.id} désactivé par l'agent ${acces.user?.agentId ?? "inconnu"}`);
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "desactiverExpertAction");
  }
}

export async function reactiverExpertAction(input: unknown): Promise<ActionResult<void>> {
  const acces = await checkBackofficePermission(BackofficePermission.EXPERTS_WRITE);
  if (!acces.hasAccess) return { success: false, error: "Réservé au super-administrateur" };
  const saisie = z.object({ id: idSchema }).safeParse(input);
  if (!saisie.success) return { success: false, error: saisie.error.issues[0].message };
  try {
    await reactiverExpert(saisie.data.id);
    console.info(`[experts] Expert ${saisie.data.id} réactivé par l'agent ${acces.user?.agentId ?? "inconnu"}`);
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "reactiverExpertAction");
  }
}
