import { pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { typeStructurePgEnum } from "../enums/enums";

// Structure qui emploie des agents : ses rôles sont ses habilitations (ligne entreprises_amo, ligne allers_vers).
export const structures = pgTable(
  "structures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Fixé à la création : une structure expert ne porte que l'habilitation expert (ADR-0053).
    type: typeStructurePgEnum("type").notNull().default("accompagnement"),
    nom: text("nom").notNull(),
    // Identité recopiée sur chaque ligne d'habilitation, qui ne la modifie jamais elle-même (ADR-0053).
    siret: varchar("siret", { length: 14 }),
    adresse: varchar("adresse", { length: 500 }).notNull().default(""),
    telephone: varchar("telephone", { length: 20 }).notNull().default(""),
    horaires: text("horaires"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Une société AMO et experte a deux structures, du même SIRET.
  (table) => ({ siretParType: unique("structures_type_siret_unique").on(table.type, table.siret) })
);

export type Structure = typeof structures.$inferSelect;
export type NewStructure = typeof structures.$inferInsert;
