import ExcelJS from "exceljs";
import { db } from "@/shared/database/client";
import { entreprisesAmo, entreprisesAmoCommunes, entreprisesAmoEpci } from "@/shared/database/schema";
import { eq } from "drizzle-orm";

interface AmoRow {
  nom: string;
  epci: string;
  siret: string;
  departements: string;
  emails: string;
  telephone: string;
  adresse: string;
  codes_insee: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    entreprisesCreated: number;
    entreprisesUpdated: number;
    communesCreated: number;
    epciCreated: number;
  };
  errors?: string[];
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
 * Parse un fichier Excel et retourne les lignes typées
 */
async function parseExcelFile(buffer: ArrayBuffer): Promise<AmoRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const rows: AmoRow[] = [];
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
      epci: rowData.epci || "",
      siret: rowData.siret || "",
      departements: rowData.departements || "",
      emails: rowData.emails || "",
      telephone: rowData.telephone || "",
      adresse: rowData.adresse || "",
      codes_insee: rowData.codes_insee || "",
    });
  });

  return rows;
}

/**
 * Parse et importe les données AMO depuis un fichier Excel
 */
export async function importAmosFromExcel(formData: FormData, clearExisting: boolean = false): Promise<ImportResult> {
  const file = formData.get("file") as File;

  if (!file) {
    return {
      success: false,
      message: "Aucun fichier fourni",
    };
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return {
      success: false,
      message: "Le fichier doit être au format Excel (.xlsx ou .xls)",
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = await parseExcelFile(arrayBuffer);

  if (data.length === 0) {
    return {
      success: false,
      message: "Le fichier Excel est vide",
    };
  }

  const trulyRequired = ["nom", "siret", "departements", "emails"];
  const firstRow = data[0];
  const missingRequired = trulyRequired.filter((col) => !(col in firstRow));

  if (missingRequired.length > 0) {
    return {
      success: false,
      message: `Colonnes manquantes : ${missingRequired.join(", ")}`,
    };
  }

  if (clearExisting) {
    await db.delete(entreprisesAmoEpci);
    await db.delete(entreprisesAmoCommunes);
    await db.delete(entreprisesAmo);
  }

  let entreprisesCreated = 0;
  let entreprisesUpdated = 0;
  let communesCreated = 0;
  let epciCreated = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      if (!row.nom?.trim()) {
        errors.push(`Ligne ignorée : nom manquant`);
        continue;
      }

      const siret = String(row.siret || "").trim();
      if (!siret || !/^\d{14}$/.test(siret)) {
        errors.push(`${row.nom} : SIRET invalide (doit être 14 chiffres)`);
        continue;
      }

      if (!row.emails?.trim()) {
        errors.push(`${row.nom} : emails manquants`);
        continue;
      }

      const emailsList = row.emails
        .split(";")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));

      if (emailsList.length === 0) {
        errors.push(`${row.nom} : aucun email valide trouvé`);
        continue;
      }

      if (!row.departements?.trim()) {
        errors.push(`${row.nom} : départements manquants`);
        continue;
      }

      const departementsFormatted = row.departements
        .split(",")
        .map((dep) => dep.trim())
        .filter((dep) => dep.length > 0)
        .join(", ");

      const existingAmo = await db
        .select({ id: entreprisesAmo.id })
        .from(entreprisesAmo)
        .where(eq(entreprisesAmo.siret, siret))
        .limit(1);

      const isUpdate = existingAmo.length > 0;

      const [entreprise] = await db
        .insert(entreprisesAmo)
        .values({
          nom: row.nom.trim(),
          siret,
          departements: departementsFormatted,
          emails: emailsList.join(";"),
          telephone: formatTelephone(row.telephone),
          adresse: String(row.adresse || "").trim(),
        })
        .onConflictDoUpdate({
          target: entreprisesAmo.siret,
          set: {
            nom: row.nom.trim(),
            departements: departementsFormatted,
            emails: emailsList.join(";"),
            telephone: formatTelephone(row.telephone),
            adresse: String(row.adresse || "").trim(),
            updatedAt: new Date(),
          },
        })
        .returning();

      if (isUpdate) {
        entreprisesUpdated++;
      } else {
        entreprisesCreated++;
      }

      await db.delete(entreprisesAmoEpci).where(eq(entreprisesAmoEpci.entrepriseAmoId, entreprise.id));

      await db.delete(entreprisesAmoCommunes).where(eq(entreprisesAmoCommunes.entrepriseAmoId, entreprise.id));

      if (row.epci?.trim()) {
        const codesEpci = row.epci
          .split(";")
          .map((code) => code.trim())
          .filter((code) => /^\d{9}$/.test(code));

        if (codesEpci.length > 0) {
          const epciData = codesEpci.map((codeEpci) => ({
            entrepriseAmoId: entreprise.id,
            codeEpci,
          }));
          await db.insert(entreprisesAmoEpci).values(epciData);
          epciCreated += codesEpci.length;
        }
      }

      if (row.codes_insee?.trim()) {
        const codesInsee = row.codes_insee
          .split(",")
          .map((code) => code.trim())
          .filter((code) => /^\d{5}$/.test(code));

        if (codesInsee.length > 0) {
          const communesData = codesInsee.map((codeInsee) => ({
            entrepriseAmoId: entreprise.id,
            codeInsee,
          }));
          await db.insert(entreprisesAmoCommunes).values(communesData);
          communesCreated += codesInsee.length;
        }
      }
    } catch (error) {
      console.error(`Erreur pour ${row.nom}:`, error);
      errors.push(`${row.nom} : ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    }
  }

  const totalEntreprises = entreprisesCreated + entreprisesUpdated;
  const actionVerb =
    entreprisesCreated > 0 && entreprisesUpdated > 0
      ? "créées/mises à jour"
      : entreprisesCreated > 0
        ? "créées"
        : "mises à jour";

  return {
    success: true,
    message: `Import réussi : ${totalEntreprises} entreprises ${actionVerb}, ${epciCreated} EPCI et ${communesCreated} communes associées`,
    stats: {
      entreprisesCreated,
      entreprisesUpdated,
      communesCreated,
      epciCreated,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

function formatTelephone(value: string | number): string {
  const tel = String(value || "").trim();
  if (/^\d{9}$/.test(tel)) {
    return `0${tel}`;
  }
  return tel;
}
