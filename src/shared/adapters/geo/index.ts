/**
 * Adapter pour l'API Geo (geo.api.gouv.fr)
 * Fournit les informations territoriales (EPCI, département, région)
 */

export { fetchCommuneByCode, getEpciByCommune, getEpciDataByCommune } from "./geo.adapter";
export type { GeoApiCommuneResponse, GeoEpciData } from "./geo.types";