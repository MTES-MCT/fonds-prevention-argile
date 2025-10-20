/**
 * Barrel export pour shared/database
 */

// Client de base de données
export { db } from "./client";

// Enums PostgreSQL
export * from "./enums/enums";

// Schémas Drizzle
export * from "./schema";

// Repositories
export * from "./repositories";

// Types des schémas (pour éviter les imports directs des schémas)
export type {
  ParcoursPrevention,
  NewParcoursPrevention,
} from "./schema/parcours-prevention";

export type {
  DossierDemarchesSimplifiees,
  NewDossierDemarchesSimplifiees,
} from "./schema/dossiers-demarches-simplifiees";

export type { User, NewUser } from "./schema/users";

export type { EntrepriseAmo, NewEntrepriseAmo } from "./schema/entreprises-amo";

export type {
  EntrepriseAmoCommune,
  NewEntrepriseAmoCommune,
} from "./schema/entreprises-amo-communes";

export type {
  ParcoursAmoValidation,
  NewParcoursAmoValidation,
} from "./schema/parcours-amo-validations";

export type {
  AmoValidationToken,
  NewAmoValidationToken,
} from "./schema/amo-validation-tokens";

export type {
  EmailNotification,
  NewEmailNotification,
} from "./schema/email-notifications";
