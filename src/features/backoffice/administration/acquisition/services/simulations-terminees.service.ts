import { getClientEnv } from "@/shared/config/env.config";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";
import type { PartnerKey } from "@/shared/domain/partners";
import {
  buildPartnerSegment,
  fetchMatomoEventsByDepartment,
  fetchMatomoSimulationsTerminees,
} from "../adapters/matomo-api.adapter";
import { decouperPeriodeMatomo } from "../domain/decoupage-periode";
import {
  cumulerSimulationsTerminees,
  type CompteurResultats,
  type SimulationsTerminees,
} from "../domain/simulations-terminees";
import type { GranulariteVisites } from "../domain/types/matomo.types";

export interface FenetreMatomo {
  debut: Date;
  /** Dernier jour inclus, comme le `date` de Matomo. */
  dernierJour: Date;
}

/** Source unique des simulations terminées : entonnoir, top départements et tableau en dérivent. */
export async function getSimulationsTerminees(
  fenetre: FenetreMatomo,
  granularite: GranulariteVisites,
  partner?: PartnerKey | null
): Promise<SimulationsTerminees> {
  const segment = buildPartnerSegment(partner);
  const parties = await Promise.all(
    decouperPeriodeMatomo(fenetre.debut, fenetre.dernierJour, granularite).map(({ period, date }) =>
      fetchMatomoSimulationsTerminees({ period, date, segment })
    )
  );
  return cumulerSimulationsTerminees(parties);
}

/**
 * Simulations terminées d'un département. Une sous-période dont des résultats n'ont pas de nom
 * (antérieure au suivi par département) retombe sur la dimension, comptée elle aussi en évènements.
 */
export async function getSimulationsTermineesDepartement(
  fenetre: FenetreMatomo,
  granularite: GranulariteVisites,
  codeDepartement: string,
  partner?: PartnerKey | null
): Promise<CompteurResultats> {
  const code = toOfficialCodeDepartement(codeDepartement);
  const segment = buildPartnerSegment(partner);
  const dimensionId = Number(getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID) || null;

  const parties = await Promise.all(
    decouperPeriodeMatomo(fenetre.debut, fenetre.dernierJour, granularite).map(
      async ({ period, date }): Promise<CompteurResultats> => {
        const nommees = await fetchMatomoSimulationsTerminees({ period, date, segment });
        const sansNom = nommees.nonRenseigne.eligible + nommees.nonRenseigne.nonEligible;
        if (sansNom === 0 || !dimensionId) return nommees.parDepartement.get(code) ?? { eligible: 0, nonEligible: 0 };

        const evenements = await fetchMatomoEventsByDepartment(code, dimensionId, {
          period,
          date,
          extraSegment: segment,
          metrique: "nb_events",
        });
        return {
          eligible: evenements.get(MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE) ?? 0,
          nonEligible: evenements.get(MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE) ?? 0,
        };
      }
    )
  );

  return parties.reduce(
    (total, partie) => ({
      eligible: total.eligible + partie.eligible,
      nonEligible: total.nonEligible + partie.nonEligible,
    }),
    { eligible: 0, nonEligible: 0 }
  );
}
