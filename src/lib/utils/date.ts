const LOCALE = "fr-FR";
const DEFAULT_VALUE = "—";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...DATE_FORMAT,
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Formate une date selon les options fournies
 * @param dateInput - String de date ou null
 * @param options - Options de formatage Intl.DateTimeFormat
 * @returns La date formatée ou "—" si invalide
 */
function formatDateWithOptions(
  dateInput: string | null | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return DEFAULT_VALUE;

  try {
    const date = new Date(dateInput);
    // Vérifie si la date est valide
    if (isNaN(date.getTime())) return DEFAULT_VALUE;

    return date.toLocaleDateString(LOCALE, options);
  } catch {
    return DEFAULT_VALUE;
  }
}

/**
 * Formate une date avec heure (JJ/MM/AAAA HH:MM)
 * @param dateString - String de date ou null
 * @returns La date formatée avec l'heure
 */
export function formatDateTime(dateString: string | null | undefined): string {
  return formatDateWithOptions(dateString, DATETIME_FORMAT);
}

/**
 * Formate une date simple (JJ/MM/AAAA)
 * @param dateString - String de date ou null
 * @returns La date formatée
 */
export function formatDate(dateString: string | null | undefined): string {
  return formatDateWithOptions(dateString, DATE_FORMAT);
}

/**
 * Ajoute un nombre de jours à une date
 * @param date - Date de départ
 * @param days - Nombre de jours à ajouter
 * @returns Une nouvelle instance de Date avec les jours ajoutés
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Ajoute un nombre de jours à une date depuis une string
 * @param dateString - String de date ou null
 * @param days - Nombre de jours à ajouter
 * @returns Une nouvelle instance de Date avec les jours ajoutés ou null si invalide
 */
export function addDaysToString(
  dateString: string | null | undefined,
  days: number
): Date | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    // Vérifie si la date est valide
    if (isNaN(date.getTime())) return null;

    return addDays(date, days);
  } catch {
    return null;
  }
}

/**
 * Calcule la différence en jours entre deux dates
 * @param date1 - Première date
 * @param date2 - Deuxième date
 * @returns Le nombre de jours entre les deux dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diff / msPerDay);
}
