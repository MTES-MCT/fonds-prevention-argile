import { pgTable, uuid, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursAmoValidations } from "./parcours-amo-validations";

// Table des tokens de validation AMO
export const amoValidationTokens = pgTable(
  "amo_validation_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcoursAmoValidationId: uuid("parcours_amo_validation_id")
      .notNull()
      .references(() => parcoursAmoValidations.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { mode: "date" }),
  },
  (table) => ({
    // Index pour optimiser les recherches par token
    tokenIdx: index("amo_validation_token_idx").on(table.token),
    // Index pour optimiser les recherches par validation
    validationIdx: index("amo_validation_validation_id_idx").on(
      table.parcoursAmoValidationId
    ),
  })
);

// Relations : un token appartient à une validation AMO
export const amoValidationTokensRelations = relations(
  amoValidationTokens,
  ({ one }) => ({
    parcoursAmoValidation: one(parcoursAmoValidations, {
      fields: [amoValidationTokens.parcoursAmoValidationId],
      references: [parcoursAmoValidations.id],
    }),
  })
);

// Types TypeScript générés
export type AmoValidationToken = typeof amoValidationTokens.$inferSelect;
export type NewAmoValidationToken = typeof amoValidationTokens.$inferInsert;
