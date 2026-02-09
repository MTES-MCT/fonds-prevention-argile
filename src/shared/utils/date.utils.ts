const LOCALE = "fr-FR";
const DEFAULT_VALUE = "—";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const DATE_SHORT_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
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
function formatDateWithOptions(dateInput: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
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
 * Formate une date courte (JJ/MM/AA)
 * @param dateString - String de date ou null
 * @returns La date formatée en format court
 */
export function formatDateShort(dateString: string | null | undefined): string {
  return formatDateWithOptions(dateString, DATE_SHORT_FORMAT);
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
export function addDaysToString(dateString: string | null | undefined, days: number): Date | null {
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

/**
 * Convertit une Date en string au format SQL (YYYY-MM-DD)
 * Utilisé pour les colonnes PostgreSQL de type DATE
 *
 * @example
 * dateToSqlString(new Date('2025-12-10')) // "2025-12-10"
 */
export function dateToSqlString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convertit un string SQL (YYYY-MM-DD) en Date
 *
 * @example
 * sqlStringToDate("2025-12-10") // Date object
 */
export function sqlStringToDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Parse une date au format DD/MM/YYYY (format API Georisques) vers YYYY-MM-DD
 *
 * @example
 * parseFrenchDateToSql("10/12/2025") // "2025-12-10"
 */
export function parseFrenchDateToSql(frenchDate: string): string {
  const [day, month, year] = frenchDate.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Calcule le nombre de jours depuis une date et retourne un texte formaté
 * @param dateString - String de date ou null
 * @returns Texte formaté "Il y a X jours (JJ/MM/AAAA)" ou "Aujourd'hui (JJ/MM/AAAA)"
 *
 * @example
 * formatDaysAgo("2026-01-20") // "Il y a 9 jours (20/01/2026)"
 * formatDaysAgo("2026-01-29") // "Aujourd'hui (29/01/2026)"
 */
export function formatDaysAgo(dateString: string | null | undefined): string {
  if (!dateString) return DEFAULT_VALUE;

  try {
    const date = new Date(dateString);
    // Vérifie si la date est valide
    if (isNaN(date.getTime())) return DEFAULT_VALUE;

    const now = new Date(); 
    const days = daysBetween(date, now);
    const formattedDate = formatDate(dateString);

    if (days === 0) {
      return `Aujourd'hui (${formattedDate})`;
    }

    return `Il y a ${days} jour${days > 1 ? "s" : ""} (${formattedDate})`;
  } catch {
    return DEFAULT_VALUE;
  }
}

/**
 * Calcule le nombre de jours depuis une date et retourne un objet séparé pour l'affichage
 * @param dateString - String de date ou null
 * @returns Objet avec le texte et la date formatée séparément
 *
 * @example
 * formatDaysAgoSplit("2026-01-20") // { text: "Il y a 9 jours", date: "20/01/2026" }
 * formatDaysAgoSplit("2026-01-29") // { text: "Aujourd'hui", date: "29/01/2026" }
 */
export function formatDaysAgoSplit(dateString: string | null | undefined): { text: string; date: string } | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    // Vérifie si la date est valide
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const days = daysBetween(date, now);
    const formattedDate = formatDate(dateString);

    if (days === 0) {
      return { text: "Aujourd'hui", date: formattedDate };
    }

    return {
      text: `Il y a ${days} jour${days > 1 ? "s" : ""}`,
      date: formattedDate,
    };
  } catch {
    return null;
  }
}

/**
 * Formate une date en texte relatif "il y a X jours" ou "À l'instant"
 * @param date - Date à formater
 * @returns Texte relatif
 *
 * @example
 * formatRelativeTime(new Date()) // "À l'instant"
 * formatRelativeTime(dateIlYa2Jours) // "il y a 2 j"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const days = daysBetween(date, now);

  if (days === 0) {
    // Vérifier si c'est vraiment récent (moins de 1 minute)
    const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (secondsDiff < 60) {
      return "À l'instant";
    }
    // Moins d'une heure
    const minutesDiff = Math.floor(secondsDiff / 60);
    if (minutesDiff < 60) {
      return `il y a ${minutesDiff} min`;
    }
    // Aujourd'hui mais il y a plus d'une heure
    const hoursDiff = Math.floor(minutesDiff / 60);
    return `il y a ${hoursDiff} h`;
  }

  return `il y a ${days} j`;
}

/**
 * Formate un temps relatif sans le préfixe "il y a"
 * Utilisé pour les affichages compacts
 * Si > 7 jours : affiche la date absolue (format court DD/MM/YY)
 * @param date - Date à formater
 * @returns Temps relatif court (ex: "2 j", "5 min", "À l'instant") ou date absolue (ex: "15/01/26")
 * @example
 * formatRelativeTimeShort(new Date()) // "À l'instant"
 * formatRelativeTimeShort(dateIlYa2Jours) // "2 j"
 * formatRelativeTimeShort(dateIlYa10Jours) // "30/01/26"
 */
export function formatRelativeTimeShort(date: Date): string {
  const now = new Date();
  const days = daysBetween(date, now);

  // Si plus de 7 jours : afficher la date absolue
  if (days > 7) {
    return date.toLocaleDateString(LOCALE, DATE_SHORT_FORMAT);
  }

  if (days === 0) {
    // Vérifier si c'est vraiment récent (moins de 1 minute)
    const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (secondsDiff < 60) {
      return "À l'instant";
    }
    // Moins d'une heure
    const minutesDiff = Math.floor(secondsDiff / 60);
    if (minutesDiff < 60) {
      return `${minutesDiff} min`;
    }
    // Aujourd'hui mais il y a plus d'une heure
    const hoursDiff = Math.floor(minutesDiff / 60);
    return `${hoursDiff} h`;
  }

  return `${days} j`;
}
