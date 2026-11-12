"use server";

import { z } from "zod";
import { checkBackofficePermission, checkRoleAccess } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { UserRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";
import { expertSchema } from "../domain/regles-experts";
import type { BilanImportExperts, ExpertAnnuaire, ExpertGestion } from "../domain/experts.types";
import {
  creerExpert,
  desactiverExpert,
  listerAnnuaireComplet,
  listerExpertsGestion,
  modifierExpert,
  reactiverExpert,
  RefusOperationExpert,
} from "../services/experts-admin.service";
import { importerExperts } from "../services/experts-import.service";

export type ExpertsAdministration =
  { gestion: true; experts: ExpertGestion[] } | { gestion: false; experts: ExpertAnnuaire[] };

const idSchema = z.string().uuid("Identifiant invalide");
const TAILLE_MAX_IMPORT = 2 * 1024 * 1024;

function erreur(error: unknown, contexte: string): { success: false; error: string } {
  if (error instanceof RefusOperationExpert) return { success: false, error: error.message };
  console.error(`[${contexte}]`, error instanceof Error ? error.name : "erreur inconnue");
  return { success: false, error: "Erreur inattendue, l'opération n'a pas été enregistrée" };
}

/** Administration : gestion complète pour le super-administrateur, annuaire en lecture pour l'administrateur. */
export async function getExpertsAdministrationAction(): Promise<ActionResult<ExpertsAdministration>> {
  // L'analyste lit aussi les experts, mais seulement ceux de son territoire, par l'espace agent.
  const acces = await checkRoleAccess([UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR]);
  if (!acces.hasAccess || !acces.user) return { success: false, error: "Accès non autorisé" };
  try {
    if (hasPermission(acces.user.role as UserRole, BackofficePermission.EXPERTS_WRITE)) {
      return { success: true, data: { gestion: true, experts: await listerExpertsGestion() } };
    }
    if (!hasPermission(acces.user.role as UserRole, BackofficePermission.EXPERTS_READ)) {
      return { success: false, error: "Accès non autorisé" };
    }
    return { success: true, data: { gestion: false, experts: await listerAnnuaireComplet() } };
  } catch (error) {
    return erreur(error, "getExpertsAdministrationAction");
  }
}

export async function creerExpertAction(input: unknown): Promise<ActionResult<void>> {
  const acces = await checkBackofficePermission(BackofficePermission.EXPERTS_WRITE);
  if (!acces.hasAccess) return { success: false, error: "Réservé au super-administrateur" };
  const saisie = expertSchema.safeParse(input);
  if (!saisie.success) return { success: false, error: saisie.error.issues[0].message };
  try {
    const id = await creerExpert(saisie.data);
    console.info(`[experts] Expert ${id} créé par l'agent ${acces.user?.agentId ?? "inconnu"}`);
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "creerExpertAction");
  }
}

export async function modifierExpertAction(input: unknown): Promise<ActionResult<void>> {
  const acces = await checkBackofficePermission(BackofficePermission.EXPERTS_WRITE);
  if (!acces.hasAccess) return { success: false, error: "Réservé au super-administrateur" };
  const saisie = expertSchema.extend({ id: idSchema }).safeParse(input);
  if (!saisie.success) return { success: false, error: saisie.error.issues[0].message };
  try {
    const { id, ...expert } = saisie.data;
    await modifierExpert(id, expert);
    console.info(`[experts] Expert ${id} modifié par l'agent ${acces.user?.agentId ?? "inconnu"}`);
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "modifierExpertAction");
  }
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

export async function importerExpertsAction(formData: FormData): Promise<ActionResult<BilanImportExperts>> {
  const acces = await checkBackofficePermission(BackofficePermission.EXPERTS_WRITE);
  if (!acces.hasAccess) return { success: false, error: "Réservé au super-administrateur" };
  const fichier = formData.get("file");
  if (!(fichier instanceof File)) return { success: false, error: "Aucun fichier fourni" };
  if (!fichier.name.toLowerCase().endsWith(".xlsx")) {
    return { success: false, error: "Le fichier doit être au format Excel (.xlsx)" };
  }
  if (fichier.size > TAILLE_MAX_IMPORT) return { success: false, error: "Fichier trop volumineux (2 Mo au plus)" };
  try {
    const bilan = await importerExperts(await fichier.arrayBuffer());
    if ("erreur" in bilan) return { success: false, error: bilan.erreur };
    console.info(
      `[experts] Import par l'agent ${acces.user?.agentId ?? "inconnu"} : ${bilan.crees} créés, ${bilan.misAJour} mis à jour, ${bilan.lignesRefusees.length} lignes refusées`
    );
    return { success: true, data: bilan };
  } catch (error) {
    return erreur(error, "importerExpertsAction");
  }
}
