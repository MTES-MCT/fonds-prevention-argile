/**
 * Parsing du CSV des citoyens mockés de l'IdP FranceConnect « low ».
 * Fonction pure, sans effet de bord (pas de DB, pas de dotenv) → testable isolément.
 * Cf. `scripts/ops/fix/purge-comptes-test-fc.ts`.
 */

/** Extrait la colonne `email` (minuscule, dédoublonnée) d'un CSV FC mocké. */
export function parseTestEmails(csv: string): string[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error("CSV vide");

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const emailIdx = header.indexOf("email");
  if (emailIdx === -1) throw new Error(`Colonne 'email' absente du CSV (colonnes: ${header.join(", ")})`);

  const emails = new Set<string>();
  for (const row of lines.slice(1)) {
    // Un email FC ne contient jamais de virgule ; le split simple suffit sur ce dataset.
    const cell = row.split(",")[emailIdx]?.trim().replace(/^"|"$/g, "").toLowerCase();
    if (cell && cell.includes("@")) emails.add(cell);
  }
  return [...emails];
}
