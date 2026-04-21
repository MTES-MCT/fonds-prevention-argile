import { MATOMO_EVENTS, MatomoEvent } from "@/shared/constants/matomo.constants";
import { SimulateurStep } from "./simulateur-step.enum";

/**
 * Mapping étape simulateur vers événement Matomo
 */
export const SIMULATEUR_STEP_EVENTS: Partial<Record<SimulateurStep, MatomoEvent>> = {
  [SimulateurStep.TYPE_LOGEMENT]: MATOMO_EVENTS.SIMULATEUR_STEP_TYPE_LOGEMENT,
  [SimulateurStep.ADRESSE]: MATOMO_EVENTS.SIMULATEUR_STEP_ADRESSE,
  [SimulateurStep.ETAT_MAISON]: MATOMO_EVENTS.SIMULATEUR_STEP_ETAT_MAISON,
  [SimulateurStep.MITOYENNETE]: MATOMO_EVENTS.SIMULATEUR_STEP_MITOYENNETE,
  [SimulateurStep.INDEMNISATION]: MATOMO_EVENTS.SIMULATEUR_STEP_INDEMNISATION,
  [SimulateurStep.ASSURANCE]: MATOMO_EVENTS.SIMULATEUR_STEP_ASSURANCE,
  [SimulateurStep.PROPRIETAIRE]: MATOMO_EVENTS.SIMULATEUR_STEP_PROPRIETAIRE,
  [SimulateurStep.REVENUS]: MATOMO_EVENTS.SIMULATEUR_STEP_REVENUS,
};
