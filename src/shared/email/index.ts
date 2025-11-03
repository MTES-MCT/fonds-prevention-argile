/**
 * Exports SERVEUR uniquement
 * Ne pas importer dans des composants clients
 *
 * Pour les composants clients, utilisez :
 * - @/shared/email/actions (Server Actions)
 * - @/shared/email/client (types)
 */

// Services (Nodemailer - SERVEUR UNIQUEMENT)
export * from "./services";

// Templates (React Server Components)
export * from "./templates";

// Utils serveur
export * from "./utils";

// Config
export * from "./config";
