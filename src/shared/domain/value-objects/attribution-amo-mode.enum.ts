/**
 * Mode d'attribution d'un AMO à un parcours.
 * Permet de tracer comment la `parcours_amo_validations` a été créée :
 *   - MANUEL : l'utilisateur a choisi un AMO dans une liste (mode FACULTATIF).
 *   - AUTO_OBLIGATOIRE : auto-affecté car le département impose un AMO unique.
 *   - AUTO_AV_AMO : auto-affecté car le département a un aller-vers qui joue le rôle d'AMO.
 *   - AUCUN : le demandeur a explicitement renoncé à un AMO (statut `SANS_AMO`).
 */
export enum AttributionAmoMode {
  MANUEL = "manuel",
  AUTO_OBLIGATOIRE = "auto_obligatoire",
  AUTO_AV_AMO = "auto_av_amo",
  AUCUN = "aucun",
}
