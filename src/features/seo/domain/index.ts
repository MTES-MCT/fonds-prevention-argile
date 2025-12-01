// Config
export {
  DEPARTEMENTS_ELIGIBLES_RGA,
  COMMUNES_PAR_DEPARTEMENT,
  API_GEO,
  getDepartementEligible,
  isDepartementEligible,
  getAllDepartementsEligibles,
} from "./config/seo.config";
export type { CodeDepartementEligible } from "./config/seo.config";

// Types
export type {
  DepartementSEO,
  CommuneSEO,
  EpciSEO,
  CoconSEOData,
  ApiGeoDepartement,
  ApiGeoCommune,
  ApiGeoEpci,
  SlugOptions,
} from "./types";
