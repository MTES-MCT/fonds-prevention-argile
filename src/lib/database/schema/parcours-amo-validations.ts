import { pgTable, uuid, timestamp, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { entreprisesAmo } from "./entreprises-amo";
import { StatutValidationAmo } from "@/lib/parcours/amo/amo.types";
import { statutValidationAmoPgEnum } from "../enums/parcours.enums";

export const parcoursAmoValidations = pgTable("parcours_amo_validations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Relation unique avec le parcours
  parcoursId: uuid("parcours_id")
    .notNull()
    .unique() // Un parcours = une validation AMO
    .references(() => parcoursPrevention.id, { onDelete: "cascade" }),

  // L'entreprise AMO choisie par l'utilisateur
  entrepriseAmoId: uuid("entreprise_amo_id")
    .notNull()
    .references(() => entreprisesAmo.id, { onDelete: "restrict" }),

  // Statut de la validation
  statut: statutValidationAmoPgEnum("statut")
    .notNull()
    .default(StatutValidationAmo.EN_ATTENTE),

  // Commentaire/justification de l'AMO
  commentaire: text("commentaire"),

  // Données personnelles temporaires (supprimées après validation)
  userPrenom: text("user_prenom"),
  userNom: text("user_nom"),
  adresseLogement: text("adresse_logement"),

  // Timestamps
  choisieAt: timestamp("choisie_at", { mode: "date" }).notNull().defaultNow(),
  valideeAt: timestamp("validee_at", { mode: "date" }),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Relations
export const parcoursAmoValidationsRelations = relations(
  parcoursAmoValidations,
  ({ one }) => ({
    parcours: one(parcoursPrevention, {
      fields: [parcoursAmoValidations.parcoursId],
      references: [parcoursPrevention.id],
    }),
    entrepriseAmo: one(entreprisesAmo, {
      fields: [parcoursAmoValidations.entrepriseAmoId],
      references: [entreprisesAmo.id],
    }),
  })
);

// Types TypeScript générés
export type ParcoursAmoValidation = typeof parcoursAmoValidations.$inferSelect;
export type NewParcoursAmoValidation =
  typeof parcoursAmoValidations.$inferInsert;
