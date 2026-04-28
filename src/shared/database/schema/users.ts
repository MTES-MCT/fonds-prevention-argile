import { pgTable, varchar, timestamp, uuid, text } from "drizzle-orm/pg-core";
import { sourceAcquisitionPgEnum } from "../enums/enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fcId: varchar("fc_id", { length: 255 }).unique().notNull(),
  nom: varchar("nom", { length: 255 }),
  prenom: varchar("prenom", { length: 255 }),
  email: varchar("email", { length: 255 }),
  emailContact: varchar("email_contact", { length: 255 }),
  telephone: varchar("telephone", { length: 20 }),
  sourceAcquisition: sourceAcquisitionPgEnum("source_acquisition"),
  sourceAcquisitionPrecision: text("source_acquisition_precision"),
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
