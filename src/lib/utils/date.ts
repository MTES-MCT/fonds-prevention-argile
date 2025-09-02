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
