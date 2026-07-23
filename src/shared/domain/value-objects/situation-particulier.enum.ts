export enum SituationParticulier {
  PROSPECT = "prospect",
  ELIGIBLE = "eligible",
  ARCHIVE = "archive",
}

/**
 * Situation cible quand un dossier archivé redevient actif (dé-archivage) : ELIGIBLE
 * si un AMO en est responsable, PROSPECT sinon (workflow Aller-vers). Partagé entre le
 * dé-archivage manuel (`unarchiveDossierAction`) et le dé-archivage automatique après
 * correction de simulation (`updateSimulationDataAction`).
 */
export function situationApresReactivation(hasAmoResponsable: boolean): SituationParticulier {
  return hasAmoResponsable ? SituationParticulier.ELIGIBLE : SituationParticulier.PROSPECT;
}
