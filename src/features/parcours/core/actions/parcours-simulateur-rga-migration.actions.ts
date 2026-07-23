"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { RGASimulationData, PartialRGASimulationData } from "@/shared/domain/types";
import { parcoursRepo } from "@/shared/database/repositories";
import { isSimulationComplete } from "@/features/simulateur/domain/rules/navigation";
import { emitBrevoEvent, BREVO_EVENTS } from "@/shared/email/brevo";
import { isSameSimulationContent } from "../utils/simulation-comparison";

/**
 * Migre les données du simulateur RGA depuis localStorage vers la base de données
 * Appelée automatiquement après connexion FranceConnect.
 *
 * **Cas particulier dossier d'invitation AMO/AV** : si le parcours a déjà une
 * `rgaSimulationDataAgent` **complète** (cas d'un dossier créé par un agent
 * AMO ou AV avec simulation pré-remplie), on **conserve la simulation agent**
 * et on ignore la simulation demandeur. Sens métier : l'agent a fait la
 * simulation avec le demandeur lors de l'invitation, c'est l'analyse de
 * référence ; une éventuelle sim du demandeur sur le site avant claim est
 * écartée.
 *
 * Pour les autres cas (pas d'invitation OU sim agent incomplète/absente —
 * typiquement parcours "sans simulation"), on migre normalement.
 *
 * Dans les deux cas, l'action retourne `success: true` pour que le hook côté
 * client nettoie le localStorage : la sim demandeur n'est plus utile, soit
 * parce qu'elle est en BDD, soit parce qu'elle est volontairement ignorée.
 */
export async function migrateSimulationDataToDatabase(rgaData: PartialRGASimulationData): Promise<ActionResult<void>> {
  try {
    // 1. Vérifier session utilisateur
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    // 2. Récupérer le parcours de l'utilisateur
    const parcours = await parcoursRepo.findByUserId(session.userId);

    if (!parcours) {
      return {
        success: false,
        error: "Parcours non trouvé",
      };
    }

    // 3. Cas dossier d'invitation : l'agent a déjà rempli une sim complète →
    //    on garde la sim agent et on skip la sim demandeur.
    if (parcours.rgaSimulationDataAgent && isSimulationComplete(parcours.rgaSimulationDataAgent)) {
      console.log("[Migration RGA] Skip : simulation agent complète déjà présente, on garde celle-ci", {
        parcoursId: parcours.id,
      });
      return { success: true, data: undefined };
    }

    // 4. Ajouter le timestamp de simulation
    const rgaSimulationData: RGASimulationData = {
      ...rgaData,
      simulatedAt: new Date().toISOString(),
    } as RGASimulationData;

    // 5. Idempotence : une re-migration à l'identique (localStorage non purgé, autre
    //    session/appareil) ne doit ni réécrire ni ré-émettre l'évènement.
    if (isSameSimulationContent(parcours.rgaSimulationData, rgaSimulationData)) {
      return { success: true, data: undefined };
    }

    // 6. Sauvegarder en base de données (écrase l'ancienne simulation si existante)
    await parcoursRepo.updateRGAData(parcours.id, rgaSimulationData);

    // 7. Synchro Brevo (flux) : simulation enregistrée sur le parcours → repousse le contact
    //    pour que INSEE/DEPARTEMENT remontent (absents au demandeur_cree). Best-effort.
    await emitBrevoEvent(parcours.id, BREVO_EVENTS.SIMULATION_ENREGISTREE);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[Migration RGA] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la migration des données RGA",
    };
  }
}
