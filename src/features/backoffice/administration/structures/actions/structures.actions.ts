"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRoleAccess } from "@/features/auth/server";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { UserRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";
import {
  habilitationAllersVersSchema,
  habilitationAmoSchema,
  habilitationExpertSchema,
  identiteStructureSchema,
  type FicheStructure,
  type StructureListee,
} from "../domain/regles-structures";
import {
  ajouterHabilitation,
  chargerFiche,
  compterAgents,
  creerStructure,
  listerStructures,
  modifierHabilitation,
  modifierIdentite,
  RefusOperationStructure,
  retirerHabilitation,
  supprimerStructure,
} from "../services/structures-admin.service";

const ROLES_ADMINISTRATION = [UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR];
const ACCES_REFUSE = "Accès non autorisé.";
const PERMISSION_INSUFFISANTE = "Permission insuffisante pour cette opération.";
const AGENTS_RATTACHES =
  "Cette structure a des agents : seul un super-administrateur peut changer ses habilitations, qui font leurs rôles.";

const idSchema = z.string().uuid("Structure invalide");
const premiereErreur = (error: z.ZodError) => error.issues[0]?.message ?? "Données invalides";

function erreur(error: unknown, contexte: string): { success: false; error: string } {
  if (error instanceof RefusOperationStructure) return { success: false, error: error.message };
  console.error(`Erreur ${contexte}:`, error);
  return { success: false, error: "Erreur inattendue, l'opération n'a pas été enregistrée" };
}

// Coordonnées et territoires des structures alimentent les pages publiques des conseillers.
function rafraichirPagesPubliques() {
  revalidatePath("/rga", "layout");
}

const peutUne = (role: UserRole, permissions: BackofficePermission[]) =>
  permissions.some((permission) => hasPermission(role, permission));

const PERMISSION_ECRITURE = {
  amo: BackofficePermission.AMO_WRITE,
  allersVers: BackofficePermission.ALLERS_VERS_WRITE,
  expert: BackofficePermission.EXPERTS_WRITE,
} as const;

const PERMISSION_RETRAIT = {
  amo: BackofficePermission.AMO_DELETE,
  allersVers: BackofficePermission.ALLERS_VERS_DELETE,
} as const;

const habilitationSaisieSchema = z.discriminatedUnion("habilitation", [
  z.object({ habilitation: z.literal("amo"), saisie: habilitationAmoSchema }),
  z.object({ habilitation: z.literal("allersVers"), saisie: habilitationAllersVersSchema }),
  z.object({ habilitation: z.literal("expert"), saisie: habilitationExpertSchema }),
]);

const surStructure = <T extends z.ZodTypeAny>(schema: T) => z.intersection(z.object({ structureId: idSchema }), schema);

/** Liste des structures, sans leurs agents (administrateur et super-administrateur). */
export async function getStructuresAction(): Promise<ActionResult<StructureListee[]>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    return { success: true, data: await listerStructures(acces.user.role === UserRole.SUPER_ADMINISTRATEUR) };
  } catch (error) {
    return erreur(error, "getStructuresAction");
  }
}

/** Fiche d'une structure ; ses agents ne sont nommés qu'au super-administrateur. */
export async function getFicheStructureAction(input: unknown): Promise<ActionResult<FicheStructure>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };

    const fiche = await chargerFiche(parsed.data, acces.user.role === UserRole.SUPER_ADMINISTRATEUR);
    return fiche ? { success: true, data: fiche } : { success: false, error: "Structure introuvable" };
  } catch (error) {
    return erreur(error, "getFicheStructureAction");
  }
}

/** Crée une structure avec sa première habilitation, qui fixe son type (accompagnement ou expert). */
export async function creerStructureAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    const parsed = z
      .intersection(z.object({ identite: identiteStructureSchema }), habilitationSaisieSchema)
      .safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };
    const { identite, ...premiere } = parsed.data;
    if (!hasPermission(acces.user.role as UserRole, PERMISSION_ECRITURE[premiere.habilitation])) {
      return { success: false, error: PERMISSION_INSUFFISANTE };
    }

    const id = await creerStructure(identite, premiere);
    rafraichirPagesPubliques();
    return { success: true, data: { id } };
  } catch (error) {
    return erreur(error, "creerStructureAction");
  }
}

export async function modifierIdentiteAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    if (!peutUne(acces.user.role as UserRole, Object.values(PERMISSION_ECRITURE))) {
      return { success: false, error: PERMISSION_INSUFFISANTE };
    }
    const parsed = z.object({ structureId: idSchema, identite: identiteStructureSchema }).safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };

    await modifierIdentite(parsed.data.structureId, parsed.data.identite);
    rafraichirPagesPubliques();
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "modifierIdentiteAction");
  }
}

/** Supprime une structure et ses habilitations ; une structure expert relève du super-administrateur. */
export async function supprimerStructureAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };
    const role = acces.user.role as UserRole;
    const fiche = await chargerFiche(parsed.data, role === UserRole.SUPER_ADMINISTRATEUR);
    if (!fiche) return { success: false, error: "Structure introuvable" };
    const requises = fiche.type === "expert" ? [BackofficePermission.EXPERTS_WRITE] : Object.values(PERMISSION_RETRAIT);
    if (!peutUne(role, requises)) return { success: false, error: PERMISSION_INSUFFISANTE };

    await supprimerStructure(parsed.data);
    rafraichirPagesPubliques();
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "supprimerStructureAction");
  }
}

/** Ajoute une habilitation ; sur une structure qui a des agents, réservé au super-administrateur. */
export async function ajouterHabilitationAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    const parsed = surStructure(habilitationSaisieSchema).safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };
    const role = acces.user.role as UserRole;
    const { structureId, ...demande } = parsed.data;
    if (!hasPermission(role, PERMISSION_ECRITURE[demande.habilitation])) {
      return { success: false, error: PERMISSION_INSUFFISANTE };
    }
    if (
      demande.habilitation !== "expert" &&
      role !== UserRole.SUPER_ADMINISTRATEUR &&
      (await compterAgents(structureId)) > 0
    ) {
      return { success: false, error: AGENTS_RATTACHES };
    }

    await ajouterHabilitation(structureId, demande);
    rafraichirPagesPubliques();
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "ajouterHabilitationAction");
  }
}

/** Territoire, équipe et contacts propres à l'habilitation : sans effet sur les rôles. */
export async function modifierHabilitationAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    const parsed = surStructure(habilitationSaisieSchema).safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };
    const { structureId, ...demande } = parsed.data;
    if (!hasPermission(acces.user.role as UserRole, PERMISSION_ECRITURE[demande.habilitation])) {
      return { success: false, error: PERMISSION_INSUFFISANTE };
    }

    await modifierHabilitation(structureId, demande);
    rafraichirPagesPubliques();
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "modifierHabilitationAction");
  }
}

/** Retire l'AMO ou l'Aller-vers ; sur une structure qui a des agents, réservé au super-administrateur. */
export async function retirerHabilitationAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const acces = await checkRoleAccess(ROLES_ADMINISTRATION);
    if (!acces.hasAccess || !acces.user) return { success: false, error: ACCES_REFUSE };
    const parsed = z.object({ structureId: idSchema, habilitation: z.enum(["amo", "allersVers"]) }).safeParse(input);
    if (!parsed.success) return { success: false, error: premiereErreur(parsed.error) };
    const role = acces.user.role as UserRole;
    const { structureId, habilitation } = parsed.data;
    if (!hasPermission(role, PERMISSION_RETRAIT[habilitation])) {
      return { success: false, error: PERMISSION_INSUFFISANTE };
    }
    if (role !== UserRole.SUPER_ADMINISTRATEUR && (await compterAgents(structureId)) > 0) {
      return { success: false, error: AGENTS_RATTACHES };
    }

    await retirerHabilitation(structureId, habilitation);
    rafraichirPagesPubliques();
    return { success: true, data: undefined };
  } catch (error) {
    return erreur(error, "retirerHabilitationAction");
  }
}
