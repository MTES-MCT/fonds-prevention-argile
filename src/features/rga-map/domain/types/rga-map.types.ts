import type { BuildingData } from "@/shared/services/bdnb";

/**
 * Coordonnées géographiques
 */
export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Props du composant RgaMap
 */
export interface RgaMapProps {
  /**
   * Centre de la carte
   * En mode readOnly, obligatoire
   * Sinon, optionnel (défaut: centre France)
   */
  center?: Coordinates;

  /**
   * Niveau de zoom initial
   * Défaut: 4.8 (France) ou 17 si center fourni
   */
  zoom?: number;

  /**
   * Mode lecture seule
   * Désactive la sélection de bâtiments
   * @default false
   */
  readOnly?: boolean;

  /**
   * Afficher un marqueur au centre
   * @default false
   */
  showMarker?: boolean;

  /**
   * Callback appelé quand un bâtiment est sélectionné
   * Ignoré si readOnly est true
   */
  onBuildingSelect?: (data: BuildingData | null) => void;

  /**
   * Callback appelé en cas d'erreur
   */
  onError?: (error: Error) => void;

  /**
   * Hauteur de la carte
   * @default "500px"
   */
  height?: string;

  /**
   * Classe CSS additionnelle
   */
  className?: string;
}

/**
 * État interne de la carte
 */
export interface RgaMapState {
  /** Carte initialisée et prête */
  isReady: boolean;

  /** Chargement en cours (données bâtiment) */
  isLoading: boolean;

  /** Erreur éventuelle */
  error: Error | null;

  /** ID RNB du bâtiment actuellement sélectionné */
  selectedRnbId: string | null;

  /** ID RNB du bâtiment survolé */
  hoveredRnbId: string | null;
}

/**
 * Données d'un bâtiment sélectionné sur la carte
 */
export interface SelectedBuilding {
  /** ID RNB */
  rnbId: string;

  /** Coordonnées du clic */
  coordinates: Coordinates;
}

/**
 * Options pour le centrage de la carte
 */
export interface FlyToOptions {
  center: Coordinates;
  zoom?: number;
  /** Durée de l'animation en ms */
  duration?: number;
}

/**
 * Niveaux de zoom prédéfinis
 */
export type ZoomLevel = "france" | "departement" | "epci" | "commune" | "building";

/**
 * Niveaux d'aléa pour l'affichage
 */
export type AleaLevel = "fort" | "moyen" | "faible" | "nul";
