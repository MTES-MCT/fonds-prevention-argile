"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import { formatNomComplet } from "@/shared/utils";
import { ActionResult } from "@/shared/types/action-result.types";
import { db } from "@/shared/database/client";
import { eq } from "drizzle-orm";
import { parcoursAmoValidations, entreprisesAmo } from "@/shared/database/schema";

export interface MyIneligibiliteData {
  raisonsIneligibilite: string[] | null;
  note: string | null;
  agentNom: string;
  structureNom: string;
  createdAt: Date;
}

/**
 * Récupère les données d'inéligibilité pour le parcours de l'utilisateur connecté.
 * Priorité : qualification allers-vers, sinon fallback sur la validation AMO.
 */
export async function getMyIneligibiliteData(): Promise<ActionResult<MyIneligibiliteData | null>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    // 1. Essayer la qualification allers-vers (données les plus riches)
    const qualification = await prospectQualificationsRepo.findLatestByParcoursId(parcours.id);
    if (qualification && qualification.decision === QualificationDecision.NON_ELIGIBLE) {
      let agentNom = "";
      let structureNom = "";

      const agent = await agentsRepository.findById(qualification.agentId);
      if (agent) {
        agentNom = formatNomComplet(agent.givenName, agent.usualName);
        if (agent.allersVersId) {
          const structure = await allersVersRepository.findById(agent.allersVersId);
          structureNom = structure?.nom ?? "";
        }
      }

      return {
        success: true,
        data: {
          raisonsIneligibilite: qualification.raisonsIneligibilite,
          note: qualification.note,
          agentNom,
          structureNom,
          createdAt: qualification.createdAt,
        },
      };
    }

    // 2. Fallback : validation AMO (commentaire + nom AMO + date)
    const [validation] = await db
      .select({
        commentaire: parcoursAmoValidations.commentaire,
        valideeAt: parcoursAmoValidations.valideeAt,
        amoNom: entreprisesAmo.nom,
      })
      .from(parcoursAmoValidations)
      .innerJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
      .limit(1);

    if (validation && validation.valideeAt) {
      // Le commentaire AMO peut contenir des raisons codées (ex: "maison_mitoyenne")
      // séparées par des virgules, ou du texte libre
      const commentaire = validation.commentaire ?? "";
      const parts = commentaire
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      return {
        success: true,
        data: {
          raisonsIneligibilite: parts.length > 0 ? parts : null,
          note: null,
          agentNom: "",
          structureNom: validation.amoNom,
          createdAt: validation.valideeAt,
        },
      };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error("Erreur getMyIneligibiliteData:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données d'inéligibilité",
    };
  }
}
