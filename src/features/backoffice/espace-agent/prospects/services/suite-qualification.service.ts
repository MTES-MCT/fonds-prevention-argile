import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import type { ParcoursPrevention } from "@/shared/database/schema";
import { AccompagnementSouhaite } from "@/shared/domain/value-objects/accompagnement-souhaite.enum";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { resolveReglesAmoForParcours } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import { assignAmoAutomatiqueForUser, passerEnAutonomie } from "@/features/parcours/amo/services/amo-selection.service";
import { ouvrirEligibiliteApresValidationAmo } from "@/features/parcours/amo/services/ouverture-eligibilite.service";
import { checkAmoCoversCodeInsee } from "@/features/parcours/amo/services/amo-query.service";
import { normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { emitBrevoEvent, BREVO_EVENTS, BREVO_ATTRS, buildConseillerAttributesFromAmo } from "@/shared/email/brevo";
import { entreprisesAmoRepo } from "@/shared/database/repositories";

/** Ce que l'agent porte au moment de qualifier, pour décider de la suite. */
export interface ContexteAgentQualification {
  agentId: string;
  entrepriseAmoId: string | null;
  /** Rôle portant la casquette AMO — l'entreprise seule ne suffit pas à valider pour elle. */
  aLaCapaciteAmo: boolean;
}

export type IssueAccompagnement =
  "transmise" | "validee_par_la_structure" | "autonomie" | "laissee_au_demandeur" | "echec";

/** Suite donnée à une qualification éligible. `null` = sans objet (autre décision). */
export type SuiteAccompagnement = { issue: IssueAccompagnement; raison: string } | null;

/**
 * Donne suite à une qualification « éligible » de l'Aller-vers, pour que le demandeur n'ait
 * pas à redemander lui-même ce que l'agent vient d'établir avec lui.
 *
 * Trois chemins, dans cet ordre :
 *  1. AMO imposé par le département → l'AMO est sollicitée, quelle que soit l'intention.
 *  2. AMO facultatif → la réponse recueillie par l'agent tranche (accompagnement, autonomie,
 *     ou « ne sait pas », qui rend la main au demandeur).
 *  3. Là où l'aller-vers EST l'AMO, une sollicitation devient une validation directe.
 *
 * Le gel « dossier chez la DDT » n'a pas de garde propre : les mutations ci-dessous exigent
 * l'étape choix AMO ou invitation, où aucun formulaire d'éligibilité n'existe encore.
 */
export async function donnerSuiteAQualificationEligible(
  parcours: ParcoursPrevention,
  agent: ContexteAgentQualification,
  accompagnementSouhaite?: AccompagnementSouhaite | null,
  estMandataireFinancier?: boolean
): Promise<SuiteAccompagnement> {
  try {
    const regles = resolveReglesAmoForParcours(parcours);
    if (regles === null) {
      return { issue: "echec", raison: "Commune du logement inconnue : accompagnement non décidé." };
    }

    if (!regles.amoObligatoire) {
      if (accompagnementSouhaite === AccompagnementSouhaite.AUTONOMIE) {
        const result = await passerEnAutonomie(parcours);
        return result.success
          ? { issue: "autonomie", raison: "Le demandeur poursuit sans accompagnement." }
          : { issue: "echec", raison: result.error };
      }
      if (accompagnementSouhaite !== AccompagnementSouhaite.ACCOMPAGNEMENT) {
        return { issue: "laissee_au_demandeur", raison: "Le demandeur choisira lui-même son accompagnement." };
      }
    }

    if (await peutValiderCommeAmo(parcours, agent, regles.avCumuleAmo)) {
      return validerCommeAmo(parcours, agent, estMandataireFinancier);
    }

    const result = await assignAmoAutomatiqueForUser(parcours.userId);
    return result.success
      ? { issue: "transmise", raison: result.data.message }
      : { issue: "echec", raison: result.error };
  } catch (error) {
    console.error(`[donnerSuiteAQualificationEligible] échec (parcours ${parcours.id}):`, error);
    return { issue: "echec", raison: "Erreur technique lors de la mise en relation avec l'AMO." };
  }
}

/**
 * La qualification vaut-elle validation AMO ? Trois conditions cumulatives : le département
 * reconnaît le cumul aller-vers/AMO, l'agent porte cette casquette, et son entreprise couvre
 * bien la commune. Sans elles, la sollicitation normale de l'AMO s'applique.
 */
async function peutValiderCommeAmo(
  parcours: ParcoursPrevention,
  agent: ContexteAgentQualification,
  avCumuleAmo: boolean
): Promise<boolean> {
  if (!avCumuleAmo || !agent.aLaCapaciteAmo || !agent.entrepriseAmoId) return false;

  const codeInsee = normalizeCodeInsee(getDemandeurFirstLogement(parcours)?.commune);
  if (!codeInsee) return false;

  return checkAmoCoversCodeInsee(agent.entrepriseAmoId, codeInsee);
}

/**
 * Écrit la validation de l'AMO directement, sans email ni token : la structure qui vient de
 * qualifier est celle qui devrait répondre, lui envoyer une demande serait un aller-retour
 * avec elle-même. C'est l'étape en doublon que cette fonction supprime.
 *
 * N'écrase aucune décision existante (`onConflictDoNothing`), et laisse l'étape `INVITATION`
 * au claim, qui la routera vers l'éligibilité en lisant ce statut.
 */
async function validerCommeAmo(
  parcours: ParcoursPrevention,
  agent: ContexteAgentQualification,
  estMandataireFinancier?: boolean
): Promise<SuiteAccompagnement> {
  const [validation] = await db
    .insert(parcoursAmoValidations)
    .values({
      parcoursId: parcours.id,
      entrepriseAmoId: agent.entrepriseAmoId,
      statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
      attributionMode: AttributionAmoMode.AUTO_AV_AMO,
      estMandataireFinancier: estMandataireFinancier ?? null,
      valideeAt: new Date(),
    })
    .onConflictDoNothing({ target: parcoursAmoValidations.parcoursId })
    .returning({ id: parcoursAmoValidations.id });

  if (!validation) {
    return { issue: "echec", raison: "Un accompagnement a déjà été décidé pour ce dossier." };
  }

  await ouvrirEligibiliteApresValidationAmo(parcours.id);

  const amo = agent.entrepriseAmoId ? await entreprisesAmoRepo.findById(agent.entrepriseAmoId) : null;
  if (amo) {
    await emitBrevoEvent(parcours.id, BREVO_EVENTS.AMO_DEFINI, {
      attributes: buildConseillerAttributesFromAmo(amo),
    });
  }
  await emitBrevoEvent(parcours.id, BREVO_EVENTS.AMO_REPONSE, {
    attributes: {
      [BREVO_ATTRS.A_AMO]: true,
      [BREVO_ATTRS.AMO_STATUT]: StatutValidationAmo.LOGEMENT_ELIGIBLE,
      ...(estMandataireFinancier !== undefined ? { [BREVO_ATTRS.EST_MANDATAIRE]: estMandataireFinancier } : {}),
    },
    eventProperties: { decision: "eligible", valide_par: "aller_vers_amo" },
  });

  return { issue: "validee_par_la_structure", raison: "Votre structure accompagne ce demandeur." };
}

/** Rend lisible, dans l'audit de la qualification, la suite qui lui a été donnée. */
export function libelleSuiteAccompagnement(suite: SuiteAccompagnement): string | null {
  if (!suite) return null;
  switch (suite.issue) {
    case "transmise":
      return "Dossier transmis à l'AMO du territoire.";
    case "validee_par_la_structure":
      return "Accompagnement pris en charge par la structure qui a qualifié le dossier.";
    case "autonomie":
      return "Le demandeur poursuit sans accompagnement.";
    case "laissee_au_demandeur":
      return "Choix de l'accompagnement laissé au demandeur.";
    case "echec":
      return `Accompagnement non enregistré : ${suite.raison}`;
  }
}
