"use server";

import { z } from "zod";
import { checkRoleAccess } from "@/features/auth/server";
import { UserRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";
import {
  detacherHabilitation,
  fusionnerStructures,
  listerStructures,
  RefusOperationStructure,
  renommerStructure,
  type StructureAdministration,
} from "../services/structures-admin.service";

const ACCES_REFUSE = "Accès non autorisé. Réservé aux super administrateurs.";

// Rôle relu en base : changer les structures change les droits des agents.
async function ensureSuperAdmin(): Promise<{ ok: true; agentId: string } | { ok: false }> {
  const acces = await checkRoleAccess([UserRole.SUPER_ADMINISTRATEUR]);
  return acces.hasAccess && acces.user ? { ok: true, agentId: acces.user.id } : { ok: false };
}

const premiereErreur = (error: z.ZodError) => error.issues[0]?.message ?? "Données invalides";

function erreur(error: unknown, contexte: string): { success: false; error: string } {
  if (error instanceof RefusOperationStructure) return { success: false, error: error.message };
  console.error(`Erreur ${contexte}:`, error);
  return { success: false, error: "Erreur inattendue, l'opération n'a pas été enregistrée" };
}

/**
 * Liste les structures, leurs habilitations et leurs agents (super admin uniquement)
 */
export async function getStructuresAction(): Promise<ActionResult<StructureAdministration[]>> {
  try {
    const garde = await ensureSuperAdmin();
    if (!garde.ok) return { success: false, error: ACCES_REFUSE };

    return { success: true, data: await listerStructures() };
  } catch (error) {
    return erreur(error, "getStructuresAction");
  }
}

const renommageSchema = z.object({
  structureId: z.string().uuid("Structure invalide"),
  nom: z.string().trim().min(1, "Le nom est requis").max(200, "Nom trop long"),
});

/**
 * Renomme une structure, sans effet sur les droits (super admin uniquement)
 */
export async function renommerStructureAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const garde = await ensureSuperAdmin();
    if (!garde.ok) return { success: false, error: ACCES_REFUSE };

    const parsed = renommageSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };

    await renommerStructure(parsed.data.structureId, parsed.data.nom);
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "renommerStructureAction");
  }
}

const fusionSchema = z.object({
  cibleId: z.string().uuid("Structure invalide"),
  sourceId: z.string().uuid("Structure invalide"),
});

/**
 * Fusionne la source dans la cible : habilitations et agents rejoignent la cible (super admin uniquement)
 */
export async function fusionnerStructuresAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const garde = await ensureSuperAdmin();
    if (!garde.ok) return { success: false, error: ACCES_REFUSE };

    const parsed = fusionSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };

    await fusionnerStructures(parsed.data.cibleId, parsed.data.sourceId);
    console.info("[structures] fusion", { ...parsed.data, parAgentId: garde.agentId });
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "fusionnerStructuresAction");
  }
}

const detachementSchema = z.object({
  structureId: z.string().uuid("Structure invalide"),
  habilitation: z.enum(["amo", "allersVers"]),
});

/**
 * Détache une habilitation dans une nouvelle structure ; les agents restent (super admin uniquement)
 */
export async function detacherHabilitationAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const garde = await ensureSuperAdmin();
    if (!garde.ok) return { success: false, error: ACCES_REFUSE };

    const parsed = detachementSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };

    await detacherHabilitation(parsed.data.structureId, parsed.data.habilitation);
    console.info("[structures] détachement", { ...parsed.data, parAgentId: garde.agentId });
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "detacherHabilitationAction");
  }
}
