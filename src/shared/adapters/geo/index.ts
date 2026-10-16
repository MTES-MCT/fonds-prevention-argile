/**
 * Adapter pour l'API Geo (geo.api.gouv.fr)
 * Fournit les informations territoriales (EPCI, département, région)
 */

export {
  fetchCommuneByCode,
  fetchCentresCommunesDepartement,
  getEpciByCommune,
  getEpciDataByCommune,
} from "./geo.adapter";
export type { GeoApiCommuneResponse, GeoCentreCommune, GeoEpciData } from "./geo.types";
