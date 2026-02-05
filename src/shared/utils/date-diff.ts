/**
 * Calcule le nombre de jours entre deux dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  return Math.floor(Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calcule le nombre de jours depuis une date jusqu'à maintenant
 */
export function daysSince(date: Date): number {
  return daysBetween(new Date(), date);
}
