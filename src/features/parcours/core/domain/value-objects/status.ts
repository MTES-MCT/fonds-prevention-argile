// Réexporter depuis le Shared Kernel
export { Status } from "@/shared/domain/value-objects/status.enum";

// Importer pour utiliser dans les fonctions utilitaires
import { Status } from "@/shared/domain/value-objects/status.enum";

/**
 * Labels français des statuts (pour affichage)
 */
export const STATUS_LABELS: Record<Status, string> = {
  [Status.TODO]: "À faire",
  [Status.EN_INSTRUCTION]: "En instruction",
  [Status.VALIDE]: "Validé",
} as const;

/**
 * Type dérivé des statuts
 */
export type StatusType = `${Status}`;

/**
 * Vérifie si le statut permet de progresser
 */
export function canProgress(status: Status): boolean {
  return status === Status.VALIDE;
}

/**
 * Vérifie si le statut est en attente
 */
export function isPending(status: Status): boolean {
  return status === Status.EN_INSTRUCTION;
}

/**
 * Vérifie si le statut est à faire
 */
export function isTodo(status: Status): boolean {
  return status === Status.TODO;
}
