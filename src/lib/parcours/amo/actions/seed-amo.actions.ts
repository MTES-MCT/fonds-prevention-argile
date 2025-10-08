"use server";

import * as XLSX from "xlsx";
import { db } from "@/lib/database/client";
import { entreprisesAmo, entreprisesAmoCommunes } from "@/lib/database/schema";
import { getSession } from "@/lib/auth/services/auth.service";
import { ROLES } from "@/lib/auth";

interface AmoRow {
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  codes_insee: string;
}

interface SeedResult {
  success: boolean;
  message: string;
  stats?: {
    entreprisesCreated: number;
    communesCreated: number;
  };
  errors?: string[];
}

/**
 * Parse et importe les données AMO depuis un fichier Excel
 */
export async function seedAmoFromExcel(
  formData: FormData,
  clearExisting: boolean = false
): Promise<SeedResult> {
  const session = await getSession();

  if (!session || session.role !== ROLES.ADMIN) {
    return {
      success: false,
      message: "Action non autorisée. Accès réservé aux administrateurs.",
    };
  }

  try {
    // 1. Récupérer le fichier depuis FormData
    const file = formData.get("file") as File;

    if (!file) {
      return {
        success: false,
        message: "Aucun fichier fourni",
      };
    }

    // Vérifier le type de fichier
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return {
        success: false,
        message: "Le fichier doit être au format Excel (.xlsx ou .xls)",
      };
    }

    // 2. Lire le fichier Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      cellDates: true,
      cellStyles: true,
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 3. Convertir en JSON
    const data = XLSX.utils.sheet_to_json<AmoRow>(worksheet);

    if (data.length === 0) {
      return {
        success: false,
        message: "Le fichier Excel est vide",
      };
    }

    // 4. Valider la structure
    const requiredColumns = [
      "nom",
      "email",
      "telephone",
      "adresse",
      "codes_insee",
    ];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      return {
        success: false,
        message: `Colonnes manquantes : ${missingColumns.join(", ")}`,
      };
    }

    // 5. Nettoyer les tables existantes si demandé
    if (clearExisting) {
      await db.delete(entreprisesAmoCommunes);
      await db.delete(entreprisesAmo);
    }

    // 6. Insérer les données
    let entreprisesCreated = 0;
    let communesCreated = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        // Validation basique
        if (!row.nom?.trim()) {
          errors.push(`Ligne ignorée : nom manquant`);
          continue;
        }

        if (!row.email?.trim() || !row.email.includes("@")) {
          errors.push(`${row.nom} : email invalide`);
          continue;
        }

        if (!row.codes_insee?.trim()) {
          errors.push(`${row.nom} : codes INSEE manquants`);
          continue;
        }

        // Insérer l'entreprise
        const [entreprise] = await db
          .insert(entreprisesAmo)
          .values({
            nom: row.nom.trim(),
            email: row.email.trim().toLowerCase(),
            telephone: formatTelephone(row.telephone),
            adresse: String(row.adresse || "").trim(),
          })
          .returning();

        entreprisesCreated++;

        // Parser et insérer les codes INSEE
        const codesInsee = row.codes_insee
          .split(",")
          .map((code) => code.trim())
          .filter((code) => code.length === 5);

        if (codesInsee.length === 0) {
          errors.push(`${row.nom} : aucun code INSEE valide trouvé`);
          continue;
        }

        const communesData = codesInsee.map((codeInsee) => ({
          entrepriseAmoId: entreprise.id,
          codeInsee,
        }));

        await db.insert(entreprisesAmoCommunes).values(communesData);
        communesCreated += codesInsee.length;
      } catch (error) {
        console.error(`Erreur pour ${row.nom}:`, error);
        errors.push(
          `${row.nom} : ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    }

    // 7. Retourner le résultat
    return {
      success: true,
      message: `Import réussi : ${entreprisesCreated} entreprises et ${communesCreated} communes créées`,
      stats: {
        entreprisesCreated,
        communesCreated,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Erreur lors du seed AMO:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'import",
    };
  }

  // Helper pour formater les téléphones français
  function formatTelephone(value: string | number): string {
    const tel = String(value || "").trim();

    // Si c'est un nombre et qu'il a 9 chiffres, ajouter le 0 devant
    if (/^\d{9}$/.test(tel)) {
      return `0${tel}`;
    }

    // Sinon retourner tel quel
    return tel;
  }
}
