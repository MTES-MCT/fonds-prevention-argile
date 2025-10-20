import { AUTH_METHODS } from "../value-objects/constants";

/**
 * Type dérivé des méthodes d'authentification
 */
export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];
