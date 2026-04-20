import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable depuis l'ajout du parcours "Aller vers" : un user "stub" peut être créé
  // par un agent AV avant que le demandeur ne se connecte via FranceConnect.
  // Postgres autorise plusieurs NULL sur une contrainte UNIQUE.
  fcId: varchar("fc_id", { length: 255 }).unique(),
  nom: varchar("nom", { length: 255 }),
  prenom: varchar("prenom", { length: 255 }),
  email: varchar("email", { length: 255 }),
  emailContact: varchar("email_contact", { length: 255 }),
  telephone: varchar("telephone", { length: 20 }),

  // Jeton unique pour rattacher un user stub créé par un AV au demandeur
  // quand il se connectera via FranceConnect (lien dans l'email d'invitation).
  claimToken: varchar("claim_token", { length: 128 }).unique(),
  claimTokenExpiresAt: timestamp("claim_token_expires_at", { mode: "date" }),
  claimedAt: timestamp("claimed_at", { mode: "date" }),

  lastLogin: timestamp("last_login", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Types TypeScript générés automatiquement
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
