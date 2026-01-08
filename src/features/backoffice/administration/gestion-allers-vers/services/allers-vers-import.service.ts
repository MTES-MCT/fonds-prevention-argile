import ExcelJS from "exceljs";
import { allersVersRepository } from "@/shared/database/repositories";
import { AllersVersImportResult, AllersVersImportRow } from "../domain";
import { deleteAllAllersVers } from "../actions";

/**
 * Service d'import des Allers Vers depuis Excel
 */

/**
 * Parse un fichier Excel et retourne les lignes
 */
async function parseExcelFile(buffer: ArrayBuffer): Promise<AllersVersImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const rows: AllersVersImportRow[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || "")
          .toLowerCase()
          .trim();
      });
      return;
    }

    const rowData: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] = getCellValue(cell);
      }
    });

    rows.push({
      nom: rowData.nom || "",
      emails: rowData.emails || "",
      telephone: cleanPhoneNumber(rowData.telephone || ""),
      adresse: rowData.adresse || "",
      departements: rowData.departements || "",
      epci: rowData.epci || "",
    });
  });

  return rows;
}

/**
 * Extrait la valeur d'une cellule Excel en string
 */
function getCellValue(cell: ExcelJS.Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if ("result" in value) {
      return String(value.result ?? "");
    }
    if ("richText" in value) {
      return value.richText.map((rt) => rt.text).join("");
    }
    if ("text" in value) {
      return String(value.text ?? "");
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }

  return String(value);
}

/**
 * Nettoie et formate un numéro de téléphone
 */
function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 9) {
    return `0${cleaned}`;
  }
  return cleaned;
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

function parseEmails(emailsStr: string): string[] {
  return emailsStr
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

function parseDepartements(departementsStr: string): string[] {
  return departementsStr
    .split(",")
    .map((d) => {
      const trimmed = d.trim();
      const match = trimmed.match(/(\d{2,3}[AB]?)\s*$/);
      return match ? match[1] : trimmed;
    })
    .filter((d) => d.length > 0);
}

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
 * @param buffer - ArrayBuffer du fichier Excel
 */
export async function importAllersVersFromExcel(
  buffer: ArrayBuffer,
  clearExisting: boolean = false
): Promise<AllersVersImportResult> {
  const errors: string[] = [];
  let created = 0;

  try {
    const rows = await parseExcelFile(buffer);

    if (rows.length === 0) {
      return {
        success: false,
        created: 0,
        errors: ["Le fichier est vide ou mal formaté"],
      };
    }

    if (clearExisting) {
      await deleteAllAllersVers();
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validationError = validateRow(row, i);
      if (validationError) {
        errors.push(validationError);
        continue;
      }

      try {
        const emails = parseEmails(row.emails);
        const departements = parseDepartements(row.departements);
        const epciList = parseEpci(row.epci);

        const allersVers = await allersVersRepository.create({
          nom: row.nom.trim(),
          emails: emails,
          telephone: row.telephone?.trim() || "",
          adresse: row.adresse?.trim() || "",
        });

        if (departements.length > 0) {
          await allersVersRepository.updateDepartementsRelations(allersVers.id, departements);
        }

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
