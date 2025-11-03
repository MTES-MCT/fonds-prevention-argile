/**
 * Statistiques globales de l'application
 */
export interface Statistiques {
  // Nombre total de comptes créés
  nombreComptesCreés: number;

  // Nombre total de demandes d'AMO
  nombreDemandesAMO: number;

  // Nombre de demandes d'AMO en attente de validation
  nombreDemandesAMOEnAttente: number;

  // Nombre de dossiers Démarches Simplifiées au total
  nombreTotalDossiersDS: number;

  // Nombre de dossiers Démarches Simplifiées en brouillon
  nombreDossiersDSBrouillon: number;

  // Nombre de dossiers Démarches Simplifiées envoyés
  nombreDossiersDSEnvoyés: number;
}
