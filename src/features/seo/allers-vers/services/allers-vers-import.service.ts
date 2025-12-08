import * as XLSX from "xlsx";
import { allersVersRepository } from "@/shared/database/repositories";
import type { AllersVersImportRow, AllersVersImportResult } from "../domain/types";

/**
 * Service d'import des Allers Vers depuis Excel
 */

/**
 * Parse un fichier Excel et retourne les lignes
 */
function parseExcelFile(buffer: Buffer): AllersVersImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<AllersVersImportRow>(worksheet, {
    raw: false,
    defval: "",
  });

  return rows;
}

/**
 * Valide une ligne d'import
 */
function validateRow(row: AllersVersImportRow, index: number): string | null {
  if (!row.nom || row.nom.trim() === "") {
    return `Ligne ${index + 2}: Le nom est obligatoire`;
  }

  if (!row.emails || row.emails.trim() === "") {
    return `Ligne ${index + 2}: Au moins un email est obligatoire`;
  }

  if (!row.departements || row.departements.trim() === "") {
    return `Ligne ${index + 2}: Au moins un département est obligatoire`;
  }

  return null;
}

/**
 * Parse les emails depuis une chaîne
 */
function parseEmails(emailsStr: string): string[] {
  return emailsStr
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Parse les départements depuis une chaîne
 */
function parseDepartements(departementsStr: string): string[] {
  return departementsStr
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

/**
 * Parse les EPCI depuis une chaîne
 */
function parseEpci(epciStr: string): string[] {
  if (!epciStr || epciStr.trim() === "") {
    return [];
  }

  return epciStr
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Importe des Allers Vers depuis un fichier Excel
 */
export async function importAllersVersFromExcel(buffer: Buffer): Promise<AllersVersImportResult> {
  const errors: string[] = [];
  let created = 0;

  try {
    // Parser le fichier
    const rows = parseExcelFile(buffer);

    if (rows.length === 0) {
      return {
        success: false,
        created: 0,
        errors: ["Le fichier est vide ou mal formaté"],
      };
    }

    // Valider et importer chaque ligne
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Validation
      const validationError = validateRow(row, i);
      if (validationError) {
        errors.push(validationError);
        continue;
      }

      try {
        // Parser les données
        const emails = parseEmails(row.emails);
        const departements = parseDepartements(row.departements);
        const epciList = parseEpci(row.epci);

        // Créer l'Allers Vers
        const allersVers = await allersVersRepository.create({
          nom: row.nom.trim(),
          emails: emails,
          telephone: row.telephone?.trim() || "",
          adresse: row.adresse?.trim() || "",
        });

        // Créer les relations départements
        if (departements.length > 0) {
          await allersVersRepository.updateDepartementsRelations(allersVers.id, departements);
        }

        // Créer les relations EPCI
        if (epciList.length > 0) {
          await allersVersRepository.updateEpciRelations(allersVers.id, epciList);
        }

        created++;
      } catch (error) {
        errors.push(
          `Ligne ${i + 2}: Erreur lors de la création - ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    }

    return {
      success: errors.length === 0,
      created,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      created: 0,
      errors: [`Erreur lors du traitement du fichier: ${error instanceof Error ? error.message : "Erreur inconnue"}`],
    };
  }
}

/**
 * Supprime tous les Allers Vers existants
 */
export async function deleteAllAllersVers(): Promise<void> {
  const allAllersVers = await allersVersRepository.findAll();

  for (const av of allAllersVers) {
    await allersVersRepository.delete(av.id);
  }
}
