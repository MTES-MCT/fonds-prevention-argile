import { ApiGeorisquesCatnat, ApiGeorisquesResponse } from "@/features/seo";
import { CatastropheNaturelle, NewCatastropheNaturelle } from "@/shared/database";

/**
 * Mock d'une catastrophe naturelle récente (format API)
 */
export const mockApiCatnatRecent: ApiGeorisquesCatnat = {
  code_national_catnat: "INTE2400123A",
  date_debut_evt: "01/06/2024",
  date_fin_evt: "30/06/2024",
  date_publication_arrete: "15/07/2024",
  date_publication_jo: "20/07/2024",
  libelle_risque_jo: "Sécheresse",
  code_insee: "63113",
  libelle_commune: "CLERMONT-FERRAND",
};

/**
 * Mock d'une catastrophe naturelle ancienne (> X années, format API)
 */
export const mockApiCatnatOld: ApiGeorisquesCatnat = {
  code_national_catnat: "INTE0100760A",
  date_debut_evt: "01/03/1998",
  date_fin_evt: "31/12/2000",
  date_publication_arrete: "27/12/2001",
  date_publication_jo: "18/01/2002",
  libelle_risque_jo: "Sécheresse",
  code_insee: "63113",
  libelle_commune: "CLERMONT-FERRAND",
};

/**
 * Mock d'une inondation (format API)
 */
export const mockApiCatnatInondation: ApiGeorisquesCatnat = {
  code_national_catnat: "INTE2300456B",
  date_debut_evt: "15/11/2023",
  date_fin_evt: "20/11/2023",
  date_publication_arrete: "10/12/2023",
  date_publication_jo: "15/12/2023",
  libelle_risque_jo: "Inondations et coulées de boue",
  code_insee: "07186",
  libelle_commune: "PRIVAS",
};

/**
 * Mock d'une réponse API Georisques paginée
 */
export const mockApiCatnatResponse: ApiGeorisquesResponse = {
  results: 2,
  page: 1,
  total_pages: 1,
  data: [mockApiCatnatRecent, mockApiCatnatInondation],
  response_code: 200,
  message: "Success",
  next: null,
  previous: null,
};

/**
 * Mock d'une réponse API vide
 */
export const mockApiCatnatEmptyResponse: ApiGeorisquesResponse = {
  results: 0,
  page: 1,
  total_pages: 0,
  data: [],
  response_code: 200,
  message: "Success",
  next: null,
  previous: null,
};

/**
 * Mock d'une catastrophe en format BDD
 */
export const mockDbCatnat: CatastropheNaturelle = {
  codeNationalCatnat: "INTE2400123A",
  dateDebutEvt: "2024-06-01",
  dateFinEvt: "2024-06-30",
  datePublicationArrete: "2024-07-15",
  datePublicationJo: "2024-07-20",
  libelleRisqueJo: "Sécheresse",
  codeInsee: "63113",
  libelleCommune: "CLERMONT-FERRAND",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Mock d'une nouvelle catastrophe pour insertion
 */
export const mockNewDbCatnat: NewCatastropheNaturelle = {
  codeNationalCatnat: "INTE2400123A",
  dateDebutEvt: "2024-06-01",
  dateFinEvt: "2024-06-30",
  datePublicationArrete: "2024-07-15",
  datePublicationJo: "2024-07-20",
  libelleRisqueJo: "Sécheresse",
  codeInsee: "63113",
  libelleCommune: "CLERMONT-FERRAND",
};

/**
 * Mock d'une liste de catastrophes (format BDD)
 */
export const mockDbCatnatList: CatastropheNaturelle[] = [
  mockDbCatnat,
  {
    ...mockDbCatnat,
    codeNationalCatnat: "INTE2300456B",
    dateDebutEvt: "2023-11-15",
    dateFinEvt: "2023-11-20",
    datePublicationArrete: "2023-12-10",
    datePublicationJo: "2023-12-15",
    libelleRisqueJo: "Inondations et coulées de boue",
    codeInsee: "07186",
    libelleCommune: "PRIVAS",
  },
];

/**
 * Mock d'une autre sécheresse récente (différente commune)
 */
export const mockApiCatnatSecheresse2: ApiGeorisquesCatnat = {
  code_national_catnat: "INTE2300789C",
  date_debut_evt: "01/07/2023",
  date_fin_evt: "30/09/2023",
  date_publication_arrete: "15/10/2023",
  date_publication_jo: "20/10/2023",
  libelle_risque_jo: "Sécheresse",
  code_insee: "07186",
  libelle_commune: "PRIVAS",
};
