/**
 * Type générique pour les retours des server actions
 * Permet une gestion uniforme des succès et erreurs
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Type helper pour extraire le type de données d'un ActionResult
 */
export type ActionData<T> = T extends ActionResult<infer U> ? U : never;
