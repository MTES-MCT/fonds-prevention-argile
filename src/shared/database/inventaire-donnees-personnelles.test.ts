import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { RAISONS_ARCHIVAGE } from "@/features/backoffice/espace-agent/shared/domain/value-objects/raisons-fin-suivi";
import {
  buildEligibiliteArchiveNote,
  RAISON_ARCHIVAGE_NON_ELIGIBLE,
  type OrigineArchivageEligibilite,
} from "@/features/simulateur/domain/services/eligibilite-archivage.service";
import { ELIGIBILITY_REASON_MESSAGES } from "@/features/simulateur/domain/value-objects/eligibility-reason.enum";

// Une colonne ajoutée sans être inventoriée passerait en clair dans chaque restauration locale.
const INVENTAIRE = readFileSync(join(process.cwd(), "docs/security/DONNEES-PERSONNELLES.md"), "utf8");
const SCRIPT = readFileSync(join(process.cwd(), "scripts/dev/anonymiser.sql"), "utf8");

interface LigneInventaire {
  table: string;
  colonnes: string[];
  conservee: boolean;
}

function lireInventaire(markdown: string): LigneInventaire[] {
  const lignes: LigneInventaire[] = [];
  let table: string | null = null;
  for (const ligne of markdown.split("\n")) {
    const titre = ligne.match(/^### `([a-z_]+)`/);
    if (titre) {
      table = titre[1];
      continue;
    }
    if (ligne.startsWith("#")) table = null;
    if (!table || !ligne.startsWith("|")) continue;

    const [colonnes = "", , traitement = ""] = ligne
      .split("|")
      .slice(1)
      .map((cellule) => cellule.trim());
    const noms = [...colonnes.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
    if (noms.length > 0) lignes.push({ table, colonnes: noms, conservee: traitement.startsWith("Conservé") });
  }
  return lignes;
}

function colonnesDuSchema(): string[] {
  const exports: unknown[] = Object.values(schema);
  return exports
    .filter((valeur): valeur is PgTable => is(valeur, PgTable))
    .flatMap((table) => Object.values(getTableColumns(table)).map((c) => `${getTableName(table)}.${c.name}`));
}

// Seuls les UPDATE de la table comptent : un nom de colonne partagé (`email`) ne suffit pas.
function misesAJour(table: string): string {
  return SCRIPT.replace(/--.*$/gm, "")
    .split(";")
    .filter((instruction) => new RegExp(`^\\s*UPDATE\\s+${table}\\b`).test(instruction))
    .join("\n");
}

// Bloc de contrôle d'une table : l'IF EXISTS qui ajoute son nom aux restes.
function controle(table: string): string {
  const bloc = SCRIPT.match(/DO \$\$([\s\S]*?)END \$\$;/)?.[1] ?? "";
  return bloc.split("END IF;").find((segment) => segment.includes(`restes || '${table}'`)) ?? "";
}

function litteralSql(valeur: string): string {
  return `'${valeur.replaceAll("'", "''")}'`;
}

function clesDesTypes(): Record<string, string[]> {
  const source = readFileSync(join(process.cwd(), "src/shared/domain/types/rga-simulation.types.ts"), "utf8");
  const interfaceSimulation = source.split("export interface RGASimulationData {")[1]?.split("\n}")[0] ?? "";
  return Object.fromEntries(
    [...interfaceSimulation.matchAll(/(\w+): \{([^}]*)\}/g)].map(([, section, corps]) => [
      section,
      [...corps.matchAll(/(\w+)\??:/g)].map((m) => m[1]),
    ])
  );
}

const inventaire = lireInventaire(INVENTAIRE);
const inventoriees = inventaire.flatMap((l) => l.colonnes.map((c) => `${l.table}.${c}`));

describe("inventaire des données personnelles", () => {
  it("répertorie chaque colonne du schéma Drizzle", () => {
    const absentes = colonnesDuSchema().filter((colonne) => !inventoriees.includes(colonne));
    expect(absentes, "à ajouter dans docs/security/DONNEES-PERSONNELLES.md").toEqual([]);
  });

  it("ne garde aucune colonne disparue du schéma", () => {
    const schemaActuel = new Set(colonnesDuSchema());
    expect(inventoriees.filter((colonne) => !schemaActuel.has(colonne))).toEqual([]);
  });

  it("classe chaque colonne une seule fois", () => {
    expect(inventoriees.filter((colonne, i) => inventoriees.indexOf(colonne) !== i)).toEqual([]);
  });

  it("fait traiter par le script SQL chaque colonne qui n'est pas conservée", () => {
    const oubliees = inventaire
      .filter((ligne) => !ligne.conservee)
      .flatMap((ligne) =>
        ligne.colonnes
          // Une affectation du SET, pas une simple mention dans le WHERE.
          .filter((colonne) => !new RegExp(`(?:\\bSET|,)\\s*${colonne}\\s*=`).test(misesAJour(ligne.table)))
          .map((colonne) => `${ligne.table}.${colonne}`)
      );
    expect(oubliees, "à traiter dans scripts/dev/anonymiser.sql").toEqual([]);
  });

  it("vérifie en fin de script chaque colonne qui n'est pas conservée", () => {
    const nonControlees = inventaire
      .filter((ligne) => !ligne.conservee)
      .flatMap((ligne) =>
        ligne.colonnes
          .filter((colonne) => !new RegExp(`\\b${colonne}\\b`).test(controle(ligne.table)))
          .map((colonne) => `${ligne.table}.${colonne}`)
      );
    expect(nonControlees, "à vérifier dans le bloc DO de scripts/dev/anonymiser.sql").toEqual([]);
  });

  it("reconnaît chaque motif d'archivage écrit par l'application", () => {
    const origines: OrigineArchivageEligibilite[] = ["creation", "edition", "demandeur"];
    const attendus = [
      ...RAISONS_ARCHIVAGE,
      RAISON_ARCHIVAGE_NON_ELIGIBLE,
      ...origines.map((origine) => buildEligibiliteArchiveNote(null, origine)),
      ...Object.values(ELIGIBILITY_REASON_MESSAGES),
    ];
    expect(attendus.filter((valeur) => !SCRIPT.includes(litteralSql(valeur)))).toEqual([]);
  });

  it("garde chaque clé de simulation du type, et rien d'autre", () => {
    const listeSql = SCRIPT.match(/cles_simulation\(\) RETURNS jsonb[\s\S]*?SELECT '([\s\S]*?)'::jsonb/)?.[1] ?? "{}";
    const autorisees: Record<string, string[]> = JSON.parse(listeSql);
    const types = clesDesTypes();
    expect(Object.keys(types).sort()).toEqual(Object.keys(autorisees).sort());
    const manquantes = Object.entries(types).flatMap(([section, cles]) =>
      cles.filter((cle) => !autorisees[section]?.includes(cle)).map((cle) => `${section}.${cle}`)
    );
    expect(manquantes, "à ajouter dans pg_temp.cles_simulation()").toEqual([]);
  });

  it("lit bien l'inventaire, sans quoi les contrôles ci-dessus passeraient à vide", () => {
    expect(inventaire.find((l) => l.colonnes.includes("email") && l.table === "users")?.conservee).toBe(false);
    expect(inventaire.find((l) => l.colonnes.includes("siret") && l.table === "agents")?.conservee).toBe(true);
    expect(controle("users")).toContain("telephone");
    expect(clesDesTypes().logement).toContain("adresse");
  });
});
