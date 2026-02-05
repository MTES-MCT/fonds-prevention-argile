import { count, eq, and, or } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import {
  calculerTrancheRevenu,
  isRegionIDF,
} from "@/features/simulateur/domain/types/rga-revenus.types";
import type {
  AmoIndicateursCles,
  AmoStatistiques,
  CommuneStats,
  RepartitionParEtape,
  RepartitionParRevenu,
} from "../domain/types";

/**
 * Service de statistiques pour l'espace AMO
 *
 * Fournit les indicateurs clés pour un AMO connecté
 */

/** Labels des étapes pour l'affichage */
const STEP_LABELS: Record<Step, string> = {
  [Step.CHOIX_AMO]: "Choix AMO",
  [Step.ELIGIBILITE]: "Éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic",
  [Step.DEVIS]: "Devis",
  [Step.FACTURES]: "Factures",
};

/** Ordre des étapes */
const STEPS_ORDER: Step[] = [Step.CHOIX_AMO, Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

/**
 * Récupère les statistiques complètes pour une entreprise AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
export async function getAmoStatistiques(entrepriseAmoId: string): Promise<AmoStatistiques> {
  const [indicateursCles, repartitionParEtape, repartitionParRevenu, topCommunes] = await Promise.all([
    getIndicateursCles(entrepriseAmoId),
    getRepartitionParEtape(entrepriseAmoId),
    getRepartitionParRevenu(entrepriseAmoId),
    getTopCommunes(entrepriseAmoId),
  ]);

  return {
    indicateursCles,
    repartitionParEtape,
    repartitionParRevenu,
    topCommunes,
  };
}

/**
 * Récupère les indicateurs clés pour une entreprise AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
async function getIndicateursCles(entrepriseAmoId: string): Promise<AmoIndicateursCles> {
  const [nombreDossiersEnCoursAccompagnement, demandesAccompagnement] = await Promise.all([
    getNombreDossiersEnCoursAccompagnement(entrepriseAmoId),
    getDemandesAccompagnement(entrepriseAmoId),
  ]);

  return {
    nombreDossiersEnCoursAccompagnement,
    nombreDemandesAccompagnement: demandesAccompagnement,
  };
}

/**
 * Compte le nombre de dossiers en cours d'accompagnement
 *
 * Un dossier est "en cours d'accompagnement" si :
 * - Le statut est LOGEMENT_ELIGIBLE (l'AMO a accepté et validé l'éligibilité du logement)
 */
async function getNombreDossiersEnCoursAccompagnement(entrepriseAmoId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Récupère les statistiques des demandes d'accompagnement
 *
 * Demandes acceptées = LOGEMENT_ELIGIBLE
 * Demandes refusées = LOGEMENT_NON_ELIGIBLE + ACCOMPAGNEMENT_REFUSE
 */
async function getDemandesAccompagnement(
  entrepriseAmoId: string
): Promise<{ total: number; acceptees: number; refusees: number }> {
  // Compter les demandes acceptées (LOGEMENT_ELIGIBLE)
  const accepteesResult = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    );

  // Compter les demandes refusées (LOGEMENT_NON_ELIGIBLE ou ACCOMPAGNEMENT_REFUSE)
  const refuseesResult = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        or(
          eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_NON_ELIGIBLE),
          eq(parcoursAmoValidations.statut, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE)
        )
      )
    );

  const acceptees = accepteesResult[0]?.count ?? 0;
  const refusees = refuseesResult[0]?.count ?? 0;

  return {
    total: acceptees + refusees,
    acceptees,
    refusees,
  };
}

/**
 * Récupère la répartition des dossiers par étape du parcours
 *
 * - Pour l'étape "Choix AMO" : compte les demandes EN_ATTENTE (en cours de traitement)
 * - Pour les autres étapes : compte les dossiers LOGEMENT_ELIGIBLE (en cours d'accompagnement)
 */
async function getRepartitionParEtape(entrepriseAmoId: string): Promise<RepartitionParEtape[]> {
  // Récupérer le count par étape pour les dossiers de cette entreprise AMO
  const results = await Promise.all(
    STEPS_ORDER.map(async (step) => {
      // Pour l'étape "Choix AMO", compter les demandes en attente
      // Pour les autres étapes, compter les dossiers en cours d'accompagnement
      const statutFilter =
        step === Step.CHOIX_AMO ? StatutValidationAmo.EN_ATTENTE : StatutValidationAmo.LOGEMENT_ELIGIBLE;

      const result = await db
        .select({ count: count() })
        .from(parcoursPrevention)
        .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
        .where(
          and(
            eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
            eq(parcoursAmoValidations.statut, statutFilter),
            eq(parcoursPrevention.currentStep, step)
          )
        );

      return {
        etape: step,
        label: STEP_LABELS[step],
        count: result[0]?.count ?? 0,
      };
    })
  );

  return results;
}

/**
 * Récupère la répartition des dossiers par catégorie de revenus
 *
 * Compte uniquement les dossiers en cours d'accompagnement (LOGEMENT_ELIGIBLE)
 * et dont les données RGA sont disponibles
 */
async function getRepartitionParRevenu(entrepriseAmoId: string): Promise<RepartitionParRevenu> {
  // Récupérer tous les parcours avec leurs données RGA
  const parcours = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
    })
    .from(parcoursPrevention)
    .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    );

  // Initialiser les compteurs
  const repartition: RepartitionParRevenu = {
    tresModeste: 0,
    modeste: 0,
    intermediaire: 0,
  };

  // Calculer la tranche de revenu pour chaque parcours
  for (const p of parcours) {
    const data = p.rgaSimulationData;

    // Vérifier que les données nécessaires sont présentes
    if (!data?.menage?.revenu_rga || !data?.menage?.personnes || !data?.logement?.code_region) {
      continue;
    }

    const tranche = calculerTrancheRevenu(
      data.menage.revenu_rga,
      data.menage.personnes,
      isRegionIDF(data.logement.code_region)
    );

    // Incrémenter le compteur correspondant (exclure "supérieure")
    switch (tranche) {
      case "très modeste":
        repartition.tresModeste++;
        break;
      case "modeste":
        repartition.modeste++;
        break;
      case "intermédiaire":
        repartition.intermediaire++;
        break;
      // "supérieure" est exclue du dispositif
    }
  }

  return repartition;
}

/**
 * Récupère le top 5 des communes avec le plus de demandeurs
 *
 * Compte uniquement les dossiers en cours d'accompagnement (LOGEMENT_ELIGIBLE)
 * et dont les données de commune sont disponibles
 */
async function getTopCommunes(entrepriseAmoId: string): Promise<CommuneStats[]> {
  // Récupérer tous les parcours avec leurs données de logement
  const parcours = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
    })
    .from(parcoursPrevention)
    .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    );

  // Grouper par commune et compter
  const communeMap = new Map<string, { commune: string; codeDepartement: string; count: number }>();

  for (const p of parcours) {
    const data = p.rgaSimulationData;

    // Vérifier que les données de commune sont présentes
    if (!data?.logement?.commune_nom || !data?.logement?.code_departement) {
      continue;
    }

    const key = `${data.logement.commune_nom}-${data.logement.code_departement}`;
    const existing = communeMap.get(key);

    if (existing) {
      existing.count++;
    } else {
      communeMap.set(key, {
        commune: data.logement.commune_nom,
        codeDepartement: data.logement.code_departement,
        count: 1,
      });
    }
  }

  // Trier par count décroissant et prendre les 5 premiers
  const sorted = Array.from(communeMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return sorted.map((item) => ({
    commune: item.commune,
    codeDepartement: item.codeDepartement,
    nombreDemandeurs: item.count,
  }));
}
