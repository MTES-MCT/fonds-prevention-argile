import ExcelJS from "exceljs";
import { allersVersRepository } from "@/shared/database/repositories";
import { parseListe } from "@/shared/utils/liste.utils";
import { decrireBilanPurge } from "../../shared/domain";
import {
  AllersVersImportResult,
  AllersVersImportRow,
  StructureAllersVersConnue,
  trouverCorrespondanceAllersVers,
} from "../domain";

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
      horaires: rowData.horaires || "",
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

function parseDepartements(departementsStr: string): string[] {
  return parseListe(departementsStr).map((d) => {
    const match = d.match(/(\d{2,3}[AB]?)\s*$/);
    return match ? match[1] : d;
  });
}

/**
 * Importe des Allers Vers depuis un fichier Excel : crée ou met à jour selon la clé naturelle
 * @param buffer - ArrayBuffer du fichier Excel
 */
export async function importAllersVersFromExcel(
  buffer: ArrayBuffer,
  clearExisting: boolean = false
): Promise<AllersVersImportResult> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let purge: string | undefined;

  try {
    const rows = await parseExcelFile(buffer);

    if (rows.length === 0) {
      return {
        success: false,
        created: 0,
        updated: 0,
        errors: ["Le fichier est vide ou mal formaté"],
      };
    }

    if (clearExisting) {
      purge = decrireBilanPurge(await allersVersRepository.supprimerNonRattaches(), "rattachées à un agent");
    }

    const connues: StructureAllersVersConnue[] = (await allersVersRepository.findAllWithRelations()).map((av) => ({
      id: av.id,
      nom: av.nom,
      departements: av.departements.map((d) => d.codeDepartement),
    }));
    // Ligne du fichier ayant déjà écrit chaque structure, pour signaler les doublons internes au fichier
    const ecritesParLigne = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ligne = i + 2;
      const validationError = validateRow(row, i);
      if (validationError) {
        errors.push(validationError);
        continue;
      }

      try {
        const nom = row.nom.trim();
        const emails = parseListe(row.emails);
        const departements = parseDepartements(row.departements);
        const epciList = parseListe(row.epci);
        const correspondance = trouverCorrespondanceAllersVers(nom, departements, connues);

        if (correspondance.type === "ambigue") {
          const details = correspondance.structures
            .map((s) => `« ${s.nom} » (${s.departements.join(", ")})`)
            .join(", ");
          errors.push(
            `Ligne ${ligne}: « ${nom} » correspond à plusieurs structures existantes (${details}), ligne ignorée. Modifiez-les depuis la liste.`
          );
          continue;
        }

        if (correspondance.type === "mise_a_jour" && ecritesParLigne.has(correspondance.id)) {
          errors.push(
            `Ligne ${ligne}: « ${nom} » désigne la même structure que la ligne ${ecritesParLigne.get(correspondance.id)}, ligne ignorée.`
          );
          continue;
        }

        const donnees = {
          nom,
          emails,
          telephone: row.telephone?.trim() || "",
          adresse: row.adresse?.trim() || "",
          horaires: row.horaires?.trim() || null,
        };

        let id: string;
        if (correspondance.type === "mise_a_jour") {
          id = correspondance.id;
          await allersVersRepository.update(id, donnees);
          const connue = connues.find((c) => c.id === id);
          if (connue) connue.departements = departements;
          updated++;
        } else {
          id = (await allersVersRepository.create(donnees)).id;
          connues.push({ id, nom, departements });
          created++;
        }
        ecritesParLigne.set(id, ligne);

        // Le fichier fait foi : un territoire retiré du fichier est retiré de la structure
        await allersVersRepository.updateDepartementsRelations(id, departements);
        await allersVersRepository.updateEpciRelations(id, epciList);
      } catch (error) {
        errors.push(
          `Ligne ${ligne}: Erreur lors de l'enregistrement - ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    }

    return {
      success: errors.length === 0,
      created,
      updated,
      errors,
      purge,
    };
  } catch (error) {
    return {
      success: false,
      created,
      updated,
      errors: [`Erreur lors du traitement du fichier: ${error instanceof Error ? error.message : "Erreur inconnue"}`],
      purge,
    };
  }
}
