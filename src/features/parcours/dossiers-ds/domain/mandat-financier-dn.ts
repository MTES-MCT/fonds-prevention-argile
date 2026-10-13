import { DS_OPTIONS_MANDATAIRE } from "./value-objects/ds-field-ids";

/**
 * Seule la réponse « administratif et financier » est exploitée : « administratif » est aussi la
 * valeur préremplie par défaut, elle ne prouve donc rien.
 */
export function estMandatFinancierDeclareDansDn(reponse: string | null | undefined): boolean {
  return reponse?.trim() === DS_OPTIONS_MANDATAIRE.FINANCIER;
}
