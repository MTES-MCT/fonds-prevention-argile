export const ARTICLES_DEPARTEMENTS: Record<string, string> = {
  "03": "de l'", // de l'Allier
  "04": "des ", // des Alpes-de-Haute-Provence
  "24": "de la ", // de la Dordogne
  "32": "du ", // du Gers
  "36": "de l'", // de l'Indre
  "47": "du ", // du Lot-et-Garonne
  "54": "de ", // de Meurthe-et-Moselle
  "59": "du ", // du Nord
  "63": "du ", // du Puy-de-Dôme
  "81": "du ", // du Tarn
  "82": "du ", // du Tarn-et-Garonne
};

export function getArticleDepartement(code: string): string {
  return ARTICLES_DEPARTEMENTS[code] || "du ";
}

// Exemple : "dans le département du Tarn"
export function formatDepartementAvecArticle(code: string, nom: string): string {
  return `${getArticleDepartement(code)}${nom}`;
}
