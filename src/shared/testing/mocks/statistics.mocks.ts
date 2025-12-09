import { FunnelStatistiques, FunnelStep, Statistiques, VisiteParJour } from "@/features/backoffice";

/**
 * Crée une visite par jour de test
 */
export const createMockVisiteParJour = (override?: Partial<VisiteParJour>): VisiteParJour => ({
  date: "2024-01-15",
  visites: 42,
  ...override,
});

/**
 * Crée un tableau de visites par jour (30 derniers jours par défaut)
 */
export const createMockVisitesParJour = (nombreJours: number = 30): VisiteParJour[] => {
  const visites: VisiteParJour[] = [];
  const today = new Date();

  for (let i = nombreJours - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    visites.push({
      date: dateStr,
      visites: Math.floor(Math.random() * 100) + 20, // Entre 20 et 120 visites
    });
  }

  return visites;
};

/**
 * Crée une étape de funnel de test
 */
export const createMockFunnelStep = (override?: Partial<FunnelStep>): FunnelStep => ({
  nom: "Étape de test",
  position: 1,
  visiteurs: 1000,
  conversions: 800,
  tauxConversion: 80.0,
  abandons: 200,
  tauxAbandon: 20.0,
  ...override,
});

/**
 * Crée un funnel de statistiques réaliste pour le simulateur RGA
 */
export const createMockFunnelStatistiques = (override?: Partial<FunnelStatistiques>): FunnelStatistiques => {
  const etapes: FunnelStep[] = [
    createMockFunnelStep({
      nom: "Démarrage simulateur",
      position: 1,
      visiteurs: 1000,
      conversions: 850,
      tauxConversion: 85.0,
      abandons: 150,
      tauxAbandon: 15.0,
    }),
    createMockFunnelStep({
      nom: "Informations logement",
      position: 2,
      visiteurs: 850,
      conversions: 680,
      tauxConversion: 80.0,
      abandons: 170,
      tauxAbandon: 20.0,
    }),
    createMockFunnelStep({
      nom: "Informations financières",
      position: 3,
      visiteurs: 680,
      conversions: 476,
      tauxConversion: 70.0,
      abandons: 204,
      tauxAbandon: 30.0,
    }),
    createMockFunnelStep({
      nom: "Résultat simulation",
      position: 4,
      visiteurs: 476,
      conversions: 400,
      tauxConversion: 84.0,
      abandons: 76,
      tauxAbandon: 16.0,
    }),
  ];

  return {
    etapes,
    visiteursInitiaux: 1000,
    conversionsFinales: 400,
    tauxConversionGlobal: 40.0,
    ...override,
  };
};

/**
 * Crée un funnel vide (tous les compteurs à zéro)
 */
export const createEmptyFunnelStatistiques = (): FunnelStatistiques => ({
  etapes: [],
  visiteursInitiaux: 0,
  conversionsFinales: 0,
  tauxConversionGlobal: 0,
});

/**
 * Crée des statistiques de test complètes
 * Basé sur le type réel Statistiques avec TOUS les champs requis
 */
export const createMockStatistiques = (override?: Partial<Statistiques>): Statistiques => ({
  // Compteurs généraux
  nombreComptesCreés: 150,
  nombreDemandesAMO: 120,
  nombreDemandesAMOEnAttente: 30,
  nombreTotalDossiersDS: 80,

  // Dossiers Démarches Simplifiées
  nombreDossiersDSBrouillon: 20,
  nombreDossiersDSEnvoyés: 60,

  // Statistiques Matomo
  nombreVisitesTotales: 5420,
  visitesParJour: createMockVisitesParJour(),

  // Funnel Simulateur RGA
  funnelSimulateurRGA: createMockFunnelStatistiques(),

  ...override,
});

/**
 * Crée des statistiques vides (tous les compteurs à zéro)
 */
export const createEmptyStatistiques = (): Statistiques => ({
  nombreComptesCreés: 0,
  nombreDemandesAMO: 0,
  nombreDemandesAMOEnAttente: 0,
  nombreTotalDossiersDS: 0,
  nombreDossiersDSBrouillon: 0,
  nombreDossiersDSEnvoyés: 0,
  nombreVisitesTotales: 0,
  visitesParJour: [],
  funnelSimulateurRGA: createEmptyFunnelStatistiques(),
});

/**
 * Crée des statistiques avec des valeurs élevées pour tester l'affichage
 */
export const createMockStatistiquesElevees = (): Statistiques => ({
  nombreComptesCreés: 9999,
  nombreDemandesAMO: 8888,
  nombreDemandesAMOEnAttente: 777,
  nombreTotalDossiersDS: 6666,
  nombreDossiersDSBrouillon: 555,
  nombreDossiersDSEnvoyés: 6111,
  nombreVisitesTotales: 125000,
  visitesParJour: createMockVisitesParJour().map((v) => ({
    ...v,
    visites: Math.floor(Math.random() * 500) + 200,
  })),
  funnelSimulateurRGA: createMockFunnelStatistiques({
    visiteursInitiaux: 10000,
    conversionsFinales: 3500,
    tauxConversionGlobal: 35.0,
    etapes: [
      createMockFunnelStep({
        nom: "Démarrage simulateur",
        position: 1,
        visiteurs: 10000,
        conversions: 8500,
        tauxConversion: 85.0,
        abandons: 1500,
        tauxAbandon: 15.0,
      }),
      createMockFunnelStep({
        nom: "Informations logement",
        position: 2,
        visiteurs: 8500,
        conversions: 6000,
        tauxConversion: 70.6,
        abandons: 2500,
        tauxAbandon: 29.4,
      }),
      createMockFunnelStep({
        nom: "Informations financières",
        position: 3,
        visiteurs: 6000,
        conversions: 4500,
        tauxConversion: 75.0,
        abandons: 1500,
        tauxAbandon: 25.0,
      }),
      createMockFunnelStep({
        nom: "Résultat simulation",
        position: 4,
        visiteurs: 4500,
        conversions: 3500,
        tauxConversion: 77.8,
        abandons: 1000,
        tauxAbandon: 22.2,
      }),
    ],
  }),
});

/**
 * Crée des statistiques avec un funnel à très faible conversion
 */
export const createMockStatistiquesFaibleConversion = (): Statistiques => ({
  ...createMockStatistiques(),
  funnelSimulateurRGA: createMockFunnelStatistiques({
    visiteursInitiaux: 1000,
    conversionsFinales: 50,
    tauxConversionGlobal: 5.0,
    etapes: [
      createMockFunnelStep({
        nom: "Démarrage simulateur",
        position: 1,
        visiteurs: 1000,
        conversions: 400,
        tauxConversion: 40.0,
        abandons: 600,
        tauxAbandon: 60.0,
      }),
      createMockFunnelStep({
        nom: "Informations logement",
        position: 2,
        visiteurs: 400,
        conversions: 200,
        tauxConversion: 50.0,
        abandons: 200,
        tauxAbandon: 50.0,
      }),
      createMockFunnelStep({
        nom: "Informations financières",
        position: 3,
        visiteurs: 200,
        conversions: 100,
        tauxConversion: 50.0,
        abandons: 100,
        tauxAbandon: 50.0,
      }),
      createMockFunnelStep({
        nom: "Résultat simulation",
        position: 4,
        visiteurs: 100,
        conversions: 50,
        tauxConversion: 50.0,
        abandons: 50,
        tauxAbandon: 50.0,
      }),
    ],
  }),
});
