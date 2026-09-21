import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  agents,
  entreprisesAmo,
  parcoursActions,
  parcoursAmoValidations,
  parcoursPrevention,
} from "@/shared/database/schema";
import { ActionResult } from "@/shared/types/action-result.types";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { ACTION_TYPE_ACCOMPAGNEMENT_ARRETE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { StatutValidationAmo, estDossierChezLaDdt } from "../domain/value-objects";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { getDossierByStep } from "../../dossiers-ds/services/dossier-ds.service";
import { AmoMode, resolveAmoModeForParcours } from "../domain/value-objects/departements-amo";
import { normalizeCodeInsee } from "../utils/amo.utils";
import { findFirstAmoForTerritory } from "./amo-selection.service";

/** D'où vient l'AMO rattachée : sa trace d'audit du détachement, ou le territoire. */
export type OrigineRattachement = "audit" | "territoire";

export interface RattacherAmoResult {
  entrepriseAmoId: string;
  amoNom: string;
  origine: OrigineRattachement;
}

/**
 * Rerattache une AMO à un parcours détaché à tort, en département où elle est obligatoire.
 *
 * Répare l'état produit par « Ne plus accompagner » avant sa garde territoriale : validation
 * `sans_amo` sans entreprise, là où l'autonomie n'existe pas. Le statut cible est `en_attente`
 * et non `logement_eligible` : le détachement a purgé `validee_at`, on ne sait donc plus si
 * l'AMO avait validé — on la laisse re-confirmer plutôt que d'inventer sa décision.
 *
 * Ne touche NI `current_step` NI `current_status` : un dossier déjà au diagnostic reste au
 * diagnostic, il ne fait que retrouver son accompagnateur. N'envoie aucun email et ne crée
 * aucun token — l'AMO retrouve le dossier dans son listing.
 *
 * Gelé entre le dépôt du formulaire d'éligibilité et la décision de la DDT, pour la même
 * raison que l'arrêt d'accompagnement (§2.7.1).
 *
 * Pur domaine : ne vérifie NI la session NI les permissions (usage ops uniquement).
 */
export async function rattacherAmo(params: { parcoursId: string }): Promise<ActionResult<RattacherAmoResult>> {
  const { parcoursId } = params;

  const [parcours] = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, parcoursId)).limit(1);
  if (!parcours) {
    return { success: false, error: "Parcours introuvable" };
  }
  if (parcours.archivedAt) {
    return { success: false, error: "Parcours archivé : le désarchiver avant de rattacher une AMO" };
  }

  const mode = resolveAmoModeForParcours(parcours);
  if (mode === null) {
    return { success: false, error: "Commune introuvable : impossible de déterminer le mode AMO" };
  }
  if (mode === AmoMode.FACULTATIF) {
    return { success: false, error: "Département à AMO facultative : l'autonomie y est légitime" };
  }

  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);
  if (!validation) {
    return { success: false, error: "Aucune validation AMO sur ce dossier" };
  }
  if (validation.statut !== StatutValidationAmo.SANS_AMO || validation.entrepriseAmoId) {
    return { success: false, error: "Ce parcours a déjà une AMO rattachée" };
  }

  // Symétrique du gel de l'arrêt (§2.7.1) : le formulaire déposé déclare « Pas de mandataire »
  // et le préremplissage ne sait que créer — rattacher ferait instruire une fausse donnée.
  const dossierEligibilite = await getDossierByStep(parcoursId, Step.ELIGIBILITE);
  if (estDossierChezLaDdt((dossierEligibilite?.dsStatus as DSStatus | null) ?? null)) {
    return {
      success: false,
      error: "Formulaire d'éligibilité déposé : attendre la décision de l'administration avant de rattacher une AMO",
    };
  }

  const resolved = await resoudreAmoARattacher(parcours);
  if (!resolved) {
    return { success: false, error: "Aucune AMO trouvée (ni dans l'historique, ni sur le territoire)" };
  }

  const attributionMode =
    mode === AmoMode.AV_AMO_FUSIONNES ? AttributionAmoMode.AUTO_AV_AMO : AttributionAmoMode.AUTO_OBLIGATOIRE;

  // Conditionné sur `sans_amo` : protège d'un rattachement concurrent.
  await db
    .update(parcoursAmoValidations)
    .set({
      entrepriseAmoId: resolved.entrepriseAmoId,
      statut: StatutValidationAmo.EN_ATTENTE,
      attributionMode,
      updatedAt: new Date(),
    })
    .where(
      and(eq(parcoursAmoValidations.id, validation.id), eq(parcoursAmoValidations.statut, StatutValidationAmo.SANS_AMO))
    );

  const [amo] = await db
    .select({ nom: entreprisesAmo.nom })
    .from(entreprisesAmo)
    .where(eq(entreprisesAmo.id, resolved.entrepriseAmoId))
    .limit(1);

  return {
    success: true,
    data: { entrepriseAmoId: resolved.entrepriseAmoId, amoNom: amo?.nom ?? "", origine: resolved.origine },
  };
}

/**
 * L'AMO d'origine d'abord (agent du dernier `accompagnement_arrete`), le territoire ensuite :
 * un détachement par le script ops ne laisse aucune trace d'audit.
 */
async function resoudreAmoARattacher(parcours: {
  id: string;
  rgaSimulationData: unknown;
  rgaSimulationDataAgent: unknown;
}): Promise<{ entrepriseAmoId: string; origine: OrigineRattachement } | null> {
  const [trace] = await db
    .select({ entrepriseAmoId: agents.entrepriseAmoId })
    .from(parcoursActions)
    .innerJoin(agents, eq(parcoursActions.agentId, agents.id))
    .where(
      and(
        eq(parcoursActions.parcoursId, parcours.id),
        eq(parcoursActions.actionType, ACTION_TYPE_ACCOMPAGNEMENT_ARRETE),
        isNotNull(agents.entrepriseAmoId)
      )
    )
    .orderBy(desc(parcoursActions.createdAt))
    .limit(1);
  if (trace?.entrepriseAmoId) {
    return { entrepriseAmoId: trace.entrepriseAmoId, origine: "audit" };
  }

  const logement = getDemandeurFirstLogement(parcours as Parameters<typeof getDemandeurFirstLogement>[0]);
  const codeInsee = normalizeCodeInsee(logement?.commune);
  if (!codeInsee) return null;

  const amo = await findFirstAmoForTerritory(codeInsee, logement?.epci ? String(logement.epci).trim() : null);
  return amo ? { entrepriseAmoId: amo.id, origine: "territoire" } : null;
}
