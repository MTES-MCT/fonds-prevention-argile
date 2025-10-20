import type { DSField } from "../domain/types/ds-field.types";
import { DSSection } from "../domain/value-objects/ds-section.enum";
import { DS_FIELDS } from "../domain/value-objects/ds-fields-eligibilite";

/**
 * Utilitaires pour manipuler les champs DS
 */

/**
 * Récupère les champs par section
 */
export function getFieldsBySection(section: DSSection): DSField[] {
  return Object.values(DS_FIELDS).filter((field) => field.section === section);
}

/**
 * Récupère les IDs des champs par section
 */
export function getFieldIdsBySection(section: DSSection): string[] {
  return getFieldsBySection(section).map((field) => field.id);
}

/**
 * Récupère un mapping simple ID -> Label
 */
export function getFieldLabelsMap(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(DS_FIELDS).map(([id, field]) => [id, field.label])
  );
}

/**
 * Récupère les sections avec leurs champs
 */
export function getSectionsWithFields(): Record<string, string[]> {
  const sections: Record<string, string[]> = {};

  Object.values(DSSection).forEach((section) => {
    sections[section] = getFieldIdsBySection(section);
  });

  return sections;
}

/**
 * Récupère uniquement les champs mappables depuis RGA
 */
export function getMappableFields(): DSField[] {
  return Object.values(DS_FIELDS).filter(
    (field) => field.rgaPath !== undefined
  );
}

/**
 * Helper pour obtenir la valeur d'un chemin dans un objet
 * Ex: getValueByPath({a: {b: 1}}, "a.b") => 1
 */
export function getValueByPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    return current && typeof current === "object"
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}
