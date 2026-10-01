import { UserRole } from "@/shared/domain/value-objects";

/**
 * Rôles habilités à initier un formulaire DN à la place du demandeur.
 * Sert au gate d'affichage (page) ET à la garde de la server action, qui vérifie en plus que
 * l'agent appartient à l'entreprise AMO mandataire financier du dossier.
 */
export const ROLES_INITIATION_FORMULAIRE: string[] = [UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS];
