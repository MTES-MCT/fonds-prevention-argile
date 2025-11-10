import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fcId: varchar("fc_id", { length: 255 }).unique().notNull(),
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
