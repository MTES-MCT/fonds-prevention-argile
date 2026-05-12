"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import type { ActionResult } from "@/shared/types";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { createDossierByAgent } from "../services/creation-dossier.service";
import { getPostCreationRedirectUrl } from "./post-creation-redirect";

const adresseBienDetailsSchema = z.object({
  label: z.string(),
  clefBan: z.string(),
  codeCommune: z.string(),
  nomCommune: z.string(),
  codePostal: z.string(),
  codeDepartement: z.string(),
  codeRegion: z.string(),
  codeEpci: z.string().optional(),
  coordinates: z.object({ lat: z.number(), lon: z.number() }),
});

const createDossierSchema = z.object({
  demandeur: z.object({
    nom: z.string().trim().min(1, "Le nom est requis"),
    prenom: z.string().trim().min(1, "Le prénom est requis"),
    email: z.string().trim().email("Email invalide"),
    telephone: z
      .string()
      .trim()
      .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, "Numéro de téléphone invalide")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  }),
  adresseBien: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  /**
   * Détails BAN de l'adresse (citycode, code département, EPCI…) pour le
   * filtre territorial des AV. Optionnel : si absent, on stocke le label seul.
   */
  adresseBienDetails: adresseBienDetailsSchema.optional(),
  // Simulation complète optionnelle (parcours 2). On laisse le service stocker tel quel.
  rgaSimulationDataAgent: z.unknown().optional(),
  sendEmail: z.boolean(),
  /**
   * Intent du wizard : détermine le « chapeau » sous lequel l'agent agit.
   * - `amo` (défaut) : entrée /dossiers → claim AMO auto, redirect /dossiers.
   * - `av` : entrée /prospects → pas de claim AMO, redirect /prospects.
   */
  intent: z.enum(["amo", "av"]).optional().default("amo"),
});

// Note : on utilise `z.input<>` plutôt que `z.infer<>` (= `z.output<>`) parce
// que `intent` a un `.default("amo")` côté Zod → en sortie c'est requis, en
// entrée c'est optionnel. Les callers (steps du wizard) doivent pouvoir omettre
// `intent` quand ils ne l'ont pas (cas legacy / tests).
type CreateDossierInput = z.input<typeof createDossierSchema>;

/**
 * Crée un dossier pour un demandeur à l'initiative d'un agent (AMO ou Aller-vers).
 *
 * Accès : AMO, ALLERS_VERS ou AMO_ET_ALLERS_VERS (via DOSSIERS_CREATE).
 * L'agent doit être rattaché à au moins une structure (allers-vers ou AMO)
 * pour qu'on puisse déterminer son `inviterName` dans l'email d'invitation.
 */
export async function createDossierAllerVersAction(
  input: CreateDossierInput
): Promise<ActionResult<{ parcoursId: string; claimUrl: string; emailSent: boolean; redirectUrl: string }>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const role = user.role as UserRole;
    if (!hasPermission(role, BackofficePermission.DOSSIERS_CREATE)) {
      return { success: false, error: "Permission refusée" };
    }

    if (!user.allersVersId && !user.entrepriseAmoId) {
      return { success: false, error: "Agent non rattaché à une structure AMO ou Allers-vers" };
    }

    if (!user.agentId) {
      return { success: false, error: "Agent non configuré" };
    }

    const parsed = createDossierSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Données invalides";
      return { success: false, error: firstError };
    }

    // Garde-fou : mode AV exige que l'agent soit rattaché à un Aller-vers.
    // Évite qu'un AMO pur forçant `?intent=av` crée un dossier "fantôme"
    // (pas de claim AMO + pas de visibilité côté prospects sans territoire).
    if (parsed.data.intent === "av" && !user.allersVersId) {
      return {
        success: false,
        error: "Mode AV demandé mais agent non rattaché à un Aller-vers",
      };
    }

    const result = await createDossierByAgent({
      agentId: user.agentId,
      demandeur: parsed.data.demandeur,
      adresseBien: parsed.data.adresseBien,
      adresseBienDetails: parsed.data.adresseBienDetails,
      rgaSimulationDataAgent: parsed.data.rgaSimulationDataAgent as RGASimulationData | undefined,
      sendEmail: parsed.data.sendEmail,
      intent: parsed.data.intent,
    });

    revalidatePath("/espace-agent", "layout");

    return {
      success: true,
      data: {
        parcoursId: result.parcoursId,
        claimUrl: result.claimUrl,
        emailSent: result.emailSent,
        redirectUrl: getPostCreationRedirectUrl(user, parsed.data.intent),
      },
    };
  } catch (error) {
    console.error("[createDossierAllerVersAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la création du dossier" };
  }
}
