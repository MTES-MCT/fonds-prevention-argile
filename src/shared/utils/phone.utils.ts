/**
 * Normalise un numéro de téléphone français vers le format 10 chiffres
 * commençant par 0 (ex. `0612345678`).
 *
 * Tolérant aux séparateurs ` `, `.`, `-`, `(`, `)` et aux préfixes
 * internationaux `+33` / `0033`.
 *
 * Renvoie une chaîne vide si la valeur ne correspond à aucun format reconnu —
 * laisse alors à l'appelant le soin de demander une nouvelle saisie.
 *
 * @example
 * normalizeFrenchPhone("06 11 22 33 44")     // "0611223344"
 * normalizeFrenchPhone("+33 6 11 22 33 44")  // "0611223344"
 * normalizeFrenchPhone("0033 6 11 22 33 44") // "0611223344"
 * normalizeFrenchPhone("not a phone")        // ""
 * normalizeFrenchPhone(undefined)            // ""
 */
export function normalizeFrenchPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 11 && digits.startsWith("33")) return "0" + digits.slice(2);
  if (digits.length === 13 && digits.startsWith("0033")) return "0" + digits.slice(4);
  return "";
}
