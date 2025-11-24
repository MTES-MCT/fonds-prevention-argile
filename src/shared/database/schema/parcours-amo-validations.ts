import { pgTable, uuid, timestamp, text, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { entreprisesAmo } from "./entreprises-amo";
import { statutValidationAmoPgEnum } from "../enums/enums";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

export const parcoursAmoValidations = pgTable(
  "parcours_amo_validations",
  {
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
    statut: statutValidationAmoPgEnum("statut").notNull().default(StatutValidationAmo.EN_ATTENTE),

    // Commentaire/justification de l'AMO
    commentaire: text("commentaire"),

    // Données personnelles temporaires
    userPrenom: text("user_prenom"),
    userNom: text("user_nom"),
    userEmail: text("user_email"),
    userTelephone: text("user_telephone"),
    adresseLogement: text("adresse_logement"),

    // ID Brevo pour corréler les webhooks
    brevoMessageId: varchar("brevo_message_id", { length: 255 }),

    // Timestamps de suivi email
    emailSentAt: timestamp("email_sent_at", { mode: "date" }),
    emailDeliveredAt: timestamp("email_delivered_at", { mode: "date" }),
    emailOpenedAt: timestamp("email_opened_at", { mode: "date" }),
    emailClickedAt: timestamp("email_clicked_at", { mode: "date" }),

    // Gestion des bounces
    emailBounceType: varchar("email_bounce_type", { length: 10 }), // 'hard' | 'soft'
    emailBounceReason: text("email_bounce_reason"),

    // Timestamps
    choisieAt: timestamp("choisie_at", { mode: "date" }).notNull().defaultNow(),
    valideeAt: timestamp("validee_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // Index pour optimiser la recherche webhook par messageId Brevo
    brevoMessageIdIdx: index("parcours_amo_validations_brevo_message_id_idx").on(table.brevoMessageId),
  })
);

// Relations
export const parcoursAmoValidationsRelations = relations(parcoursAmoValidations, ({ one }) => ({
  parcours: one(parcoursPrevention, {
    fields: [parcoursAmoValidations.parcoursId],
    references: [parcoursPrevention.id],
  }),
  entrepriseAmo: one(entreprisesAmo, {
    fields: [parcoursAmoValidations.entrepriseAmoId],
    references: [entreprisesAmo.id],
  }),
}));

// Types TypeScript générés
export type ParcoursAmoValidation = typeof parcoursAmoValidations.$inferSelect;
export type NewParcoursAmoValidation = typeof parcoursAmoValidations.$inferInsert;
