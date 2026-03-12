import { fetchMatomoFunnel } from "../adapters/matomo-api.adapter";
import type {
  FunnelStatistiques,
  FunnelStep,
  MatomoFunnelFlowTableResponse,
} from "../domain/types/matomo-funnels.types";
import { getClientEnv } from "@/shared/config/env.config";

/**
 * Récupère les statistiques du funnel "Complétude du simulateur RGA" sur les 7 derniers jours
 * Note: Une période plus longue cause des timeouts (502) sur l'API Matomo
 */
export async function getFunnelSimulateurRGA(): Promise<FunnelStatistiques> {
  try {
    const clientEnv = getClientEnv();
    const FUNNEL_ID = clientEnv.NEXT_PUBLIC_MATOMO_FUNNEL_ID || "";
    const NB_JOURS_PERIODE = 7;

    // Calculer la plage des NB_JOURS_PERIODE derniers jours
    const dateFin = new Date().toISOString().split("T")[0];
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - NB_JOURS_PERIODE);
    const dateDebutStr = dateDebut.toISOString().split("T")[0];
    const period = `${dateDebutStr},${dateFin}`;

    // Récupérer les données du funnel
    const funnelData = await fetchMatomoFunnel(FUNNEL_ID, "range", period);

    return transformMatomoFunnelData(funnelData as MatomoFunnelFlowTableResponse);
  } catch (error) {
    console.error("Erreur lors de la récupération des stats du funnel:", error);

    return {
      etapes: [],
      visiteursInitiaux: 0,
      conversionsEligibles: 0,
      conversionsNonEligibles: 0,
      tauxConversionEligibles: 0,
      tauxConversionNonEligibles: 0,
    };
  }
}

/**
 * Transforme les données brutes de l'API Matomo en FunnelStatistiques
 */
function transformMatomoFunnelData(data: MatomoFunnelFlowTableResponse): FunnelStatistiques {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      etapes: [],
      visiteursInitiaux: 0,
      conversionsEligibles: 0,
      conversionsNonEligibles: 0,
      tauxConversionEligibles: 0,
      tauxConversionNonEligibles: 0,
    };
  }

  // Transformer chaque étape
  const etapes: FunnelStep[] = data.map((step) => {
    const visiteurs = step.step_nb_visits;
    const conversions = step.step_nb_proceeded;
    const abandons = typeof step.step_nb_exits === "string" ? parseInt(step.step_nb_exits, 10) : step.step_nb_exits;

    // Parser les taux (format: "70 %")
    const tauxConversion = step.step_proceeded_rate
      ? parseFloat(step.step_proceeded_rate.replace(/\s/g, "").replace("%", "").replace(",", "."))
      : 0;

    const tauxAbandon = step.step_exited_rate
      ? parseFloat(step.step_exited_rate.replace(/\s/g, "").replace("%", "").replace(",", "."))
      : 0;

    return {
      nom: step.label,
      position: step.step_position,
      visiteurs,
      conversions,
      tauxConversion: isNaN(tauxConversion) ? 0 : tauxConversion,
      abandons: isNaN(abandons) ? 0 : abandons,
      tauxAbandon: isNaN(tauxAbandon) ? 0 : tauxAbandon,
    };
  });

  // Calculer les métriques globales
  const visiteursInitiaux = etapes[0]?.visiteurs || 0;

  // Identifier les étapes éligible et non éligible par leur label
  // Les labels Matomo peuvent être les noms d'events (simulateur_result_eligible)
  // ou les labels personnalisés du funnel (Résultat éligible)
  const etapeNonEligible = etapes.find((e) => {
    const nom = e.nom.toLowerCase();
    return nom.includes("non_eligible") || nom.includes("non éligible");
  });
  const etapeEligible = etapes.find((e) => {
    const nom = e.nom.toLowerCase();
    return (nom.includes("eligible") || nom.includes("éligible")) && e !== etapeNonEligible;
  });

  const conversionsEligibles = etapeEligible?.visiteurs || 0;
  const conversionsNonEligibles = etapeNonEligible?.visiteurs || 0;

  const tauxConversionEligibles =
    visiteursInitiaux > 0 ? Math.round((conversionsEligibles / visiteursInitiaux) * 100 * 100) / 100 : 0;
  const tauxConversionNonEligibles =
    visiteursInitiaux > 0 ? Math.round((conversionsNonEligibles / visiteursInitiaux) * 100 * 100) / 100 : 0;

  return {
    etapes,
    visiteursInitiaux,
    conversionsEligibles,
    conversionsNonEligibles,
    tauxConversionEligibles,
    tauxConversionNonEligibles,
  };
}
