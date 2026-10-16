/**
 * Adapter pour l'API Geo (geo.api.gouv.fr)
 * Fournit les informations territoriales (EPCI, département, région)
 */

export {
  fetchCommuneByCode,
  fetchCentresCommunesDepartement,
  fetchContoursDepartements,
  getEpciByCommune,
  getEpciDataByCommune,
} from "./geo.adapter";
export type { GeoApiCommuneResponse, GeoCentreCommune, GeoContourDepartement, GeoEpciData } from "./geo.types";
