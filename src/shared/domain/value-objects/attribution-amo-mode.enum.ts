/**
 * Mode d'attribution d'un AMO à un parcours.
 * Permet de tracer comment la `parcours_amo_validations` a été créée :
 *   - MANUEL : le demandeur a choisi son AMO parmi plusieurs couvrant son territoire.
 *   - AUTO_UNIQUE : seule AMO du territoire, attribuée quand le demandeur accepte d'être accompagné.
 *   - CHOIX_AGENT : l'Aller-vers a choisi l'AMO à solliciter, parmi plusieurs, en qualifiant le dossier.
 *   - AUTO_OBLIGATOIRE : auto-affecté car le département impose un AMO unique.
 *   - AUTO_AV_AMO : auto-affecté car le département a un aller-vers qui joue le rôle d'AMO.
 *   - AUCUN : le demandeur a explicitement renoncé à un AMO (statut `SANS_AMO`).
 */
export enum AttributionAmoMode {
  MANUEL = "manuel",
  AUTO_UNIQUE = "auto_unique",
  CHOIX_AGENT = "choix_agent",
  AUTO_OBLIGATOIRE = "auto_obligatoire",
  AUTO_AV_AMO = "auto_av_amo",
  AUCUN = "aucun",
}
