export enum SourceAcquisition {
  DDT = "ddt",
  AMO = "amo",
  ALLER_VERS = "aller_vers",
  ECFR = "ecfr",
  FLYERS = "flyers",
  MEDIAS = "medias",
  BULLETIN_COMMUNAL = "bulletin_communal",
  PROS_BATIMENT_IMMOBILIER = "pros_batiment_immobilier",
  REUNION_PUBLIQUE_SALON = "reunion_publique_salon",
  MOTEUR_RECHERCHE = "moteur_recherche",
  AUTRE = "autre",
}

export const SOURCE_ACQUISITION_LABELS: Record<SourceAcquisition, string> = {
  [SourceAcquisition.DDT]: "DDT (Direction Départementale des Territoires)",
  [SourceAcquisition.AMO]: "AMO (Assistant à Maîtrise d'Ouvrage)",
  [SourceAcquisition.ALLER_VERS]: "Équipe Aller-vers",
  [SourceAcquisition.ECFR]: "Un acteur local (ECFR)",
  [SourceAcquisition.FLYERS]: "Flyers",
  [SourceAcquisition.MEDIAS]: "Médias",
  [SourceAcquisition.BULLETIN_COMMUNAL]: "Bulletin de votre commune",
  [SourceAcquisition.PROS_BATIMENT_IMMOBILIER]: "Professionnels du bâtiment / immobilier",
  [SourceAcquisition.REUNION_PUBLIQUE_SALON]: "Réunion publique / salon",
  [SourceAcquisition.MOTEUR_RECHERCHE]: "Moteur de recherche",
  [SourceAcquisition.AUTRE]: "Autre",
};
