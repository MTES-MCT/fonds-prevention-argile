// Domain exports
export {
  // Config
  DEPARTEMENTS_ELIGIBLES_RGA,
  COMMUNES_PAR_DEPARTEMENT,
  API_GEO,
  getDepartementEligible,
  isDepartementEligible,
  getAllDepartementsEligibles,
} from "./domain";

export type {
  // Territory types
  DepartementSEO,
  CommuneSEO,
  EpciSEO,
  CoconSEOData,
  ApiGeoDepartement,
  ApiGeoCommune,
  ApiGeoEpci,
  SlugOptions,
} from "./domain";

// Utils exports
export { generateSlug, generateDepartementSlug, generateCommuneSlug, generateEpciSlug } from "./utils";

// Services exports
export * from "./services";
