import { pgTable, uuid, timestamp, varchar, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { dsStatusPgEnum, stepPgEnum } from "../enums/enums";
import {
  INITIATEUR_FORMULAIRE,
  type InitiateurFormulaire,
} from "../../domain/value-objects/initiateur-formulaire.enum";

// Table des dossiers Démarches Simplifiées
export const dossiersDemarchesSimplifiees = pgTable(
  "dossiers_demarches_simplifiees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcoursId: uuid("parcours_id")
      .notNull()
      .references(() => parcoursPrevention.id, { onDelete: "cascade" }),

    step: stepPgEnum("step").notNull(),

    // Références DS uniquement
    dsNumber: varchar("ds_number", { length: 50 }).unique(), // Unique directement
    dsId: varchar("ds_id", { length: 50 }),
    dsDemarcheId: varchar("ds_demarche_id", { length: 50 }).notNull(),

    dsStatus: dsStatusPgEnum("ds_status"),

    submittedAt: timestamp("submitted_at", { mode: "date" }),
    instructedAt: timestamp("instructed_at", { mode: "date" }),
    processedAt: timestamp("processed_at", { mode: "date" }),

    dsUrl: varchar("ds_url", { length: 500 }),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    lastSyncAt: timestamp("last_sync_at", { mode: "date" }),

    // Verdict DN observé au dernier sondage de la sync (état réel côté DN)
    dnProbeState: varchar("dn_probe_state", { length: 30 }),
    dnProbeAt: timestamp("dn_probe_at", { mode: "date" }),

    // Créateur du prérempli : un dossier initié par l'AMO vit sur son compte DN, hors de portée du demandeur.
    initiePar: varchar("initie_par", { length: 20 })
      .$type<InitiateurFormulaire>()
      .notNull()
      .default(INITIATEUR_FORMULAIRE.DEMANDEUR),

    // Contrôle de l'avis d'imposition (éligibilité) : verdict seul, jamais de donnée fiscale.
    avisImpotControleAt: timestamp("avis_impot_controle_at", { mode: "date" }),
    avisImpotStatut: varchar("avis_impot_statut", { length: 20 }),
    // `dateDerniereModificationChamps` DN au moment du contrôle : le relancer seulement si elle bouge.
    avisImpotChampsModifiesAt: timestamp("avis_impot_champs_modifies_at", { mode: "date" }),
  },
  // Un seul pointeur par (parcours, étape) : `getDossierByStep` serait sinon indéterministe.
  (t) => [unique("dossiers_ds_parcours_step_unique").on(t.parcoursId, t.step)]
);

// Relations : un dossier appartient à un parcours
export const dossiersDemarchesSimplifieeesRelations = relations(dossiersDemarchesSimplifiees, ({ one }) => ({
  parcours: one(parcoursPrevention, {
    fields: [dossiersDemarchesSimplifiees.parcoursId],
    references: [parcoursPrevention.id],
  }),
}));

// Types TypeScript générés
export type DossierDemarchesSimplifiees = typeof dossiersDemarchesSimplifiees.$inferSelect;
export type NewDossierDemarchesSimplifiees = typeof dossiersDemarchesSimplifiees.$inferInsert;
