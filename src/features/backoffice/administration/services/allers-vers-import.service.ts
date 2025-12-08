import * as XLSX from "xlsx";
import { allersVersRepository } from "@/shared/database/repositories";
import { AllersVersImportResult, AllersVersImportRow } from "../domain";
import { deleteAllAllersVers } from "../actions";

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

  // Parser avec raw: true pour obtenir les valeurs brutes
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    raw: true,
    defval: "",
  });

  // Convertir et nettoyer les données
  return rows.map((row) => ({
    nom: String(row.nom || ""),
    emails: String(row.emails || ""),
    telephone: cleanPhoneNumber(String(row.telephone || "")),
    adresse: String(row.adresse || ""),
    departements: String(row.departements || ""),
    epci: String(row.epci || ""),
  }));
}

/**
 * Nettoie et formate un numéro de téléphone
 * Ajoute le zéro de tête si manquant pour les numéros français
 */
function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";

  // Convertir en string et enlever tous les caractères non-numériques
  const cleaned = String(phone).replace(/\D/g, "");

  // Si le numéro fait 9 chiffres, ajouter le zéro de tête
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
 * Parse les départements depuis une chaîne et extrait les codes uniquement
 * Format attendu: "Nom du département CODE" (ex: "Indre 36", "Alpes de Haute provence 04")
 */
function parseDepartements(departementsStr: string): string[] {
  return departementsStr
    .split(",")
    .map((d) => {
      const trimmed = d.trim();
      // Extraire le code du département (2 ou 3 caractères à la fin)
      // Supporte les formats: "Indre 36", "Corse-du-Sud 2A", "Seine-et-Marne 77"
      const match = trimmed.match(/(\d{2,3}[AB]?)\s*$/);
      return match ? match[1] : trimmed;
    })
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
export async function importAllersVersFromExcel(
  buffer: Buffer,
  clearExisting: boolean = false
): Promise<AllersVersImportResult> {
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

    // Supprimer les données existantes si demandé
    if (clearExisting) {
      await deleteAllAllersVers();
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
