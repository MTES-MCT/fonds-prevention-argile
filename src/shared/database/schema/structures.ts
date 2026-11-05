import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Structure qui emploie des agents : ses rôles sont ses habilitations (ligne entreprises_amo, ligne allers_vers).
export const structures = pgTable("structures", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Structure = typeof structures.$inferSelect;
export type NewStructure = typeof structures.$inferInsert;
