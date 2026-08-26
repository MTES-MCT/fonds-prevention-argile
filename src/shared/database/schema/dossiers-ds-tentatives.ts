import { pgTable, uuid, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { stepPgEnum } from "../enums/enums";

/**
 * Registre des tentatives : TOUT numéro de dossier DN connu pour un parcours, qu'il ait été
 * déposé ou non. Append-only — une ligne n'est jamais supprimée, contrairement au pointeur
 * courant `dossiers_demarches_simplifiees`. Voir ADR-0027.
 */
export const dossiersDsTentatives = pgTable(
  "dossiers_ds_tentatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // CASCADE assumé malgré le caractère append-only : la suppression d'un parcours (RGPD)
    // doit emporter ses tentatives. Rien d'autre ne supprime jamais une ligne d'ici.
    parcoursId: uuid("parcours_id")
      .notNull()
      .references(() => parcoursPrevention.id, { onDelete: "cascade" }),

    step: stepPgEnum("step").notNull(),

    // Un numéro DN n'appartient qu'à un seul parcours (invariant ADR-0027).
    dsNumber: varchar("ds_number", { length: 50 }).notNull().unique(),
    dsId: varchar("ds_id", { length: 50 }),
    dsDemarcheId: varchar("ds_demarche_id", { length: 50 }),

    // prefill | reconciliation | manuel | backfill_pointeur | backfill_sync_error
    origine: varchar("origine", { length: 30 }).notNull(),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Le registre ne conserve QUE l'identité du dossier : l'URL de préremplissage porte le
  // `prefill_token` (un secret) et vit uniquement sur le pointeur courant, cf. ADR-0027.
  // Plusieurs tentatives par (parcours, étape) sont normales : index non unique.
  (t) => [index("dossiers_ds_tentatives_parcours_step_idx").on(t.parcoursId, t.step)]
);

export const dossiersDsTentativesRelations = relations(dossiersDsTentatives, ({ one }) => ({
  parcours: one(parcoursPrevention, {
    fields: [dossiersDsTentatives.parcoursId],
    references: [parcoursPrevention.id],
  }),
}));

export type DossierDsTentative = typeof dossiersDsTentatives.$inferSelect;
export type NewDossierDsTentative = typeof dossiersDsTentatives.$inferInsert;

/** Provenance d'une tentative — d'où vient la connaissance de ce numéro. */
export const ORIGINE_TENTATIVE = {
  /** Créée par l'app via l'API de préremplissage (cas nominal). */
  PREFILL: "prefill",
  /** Découverte par la réconciliation au dépôt (annotation FPA). */
  RECONCILIATION: "reconciliation",
  /** Saisie par un agent ou une opération manuelle (relink). */
  MANUEL: "manuel",
  /** Reprise du pointeur courant lors de l'amorçage du registre. */
  BACKFILL_POINTEUR: "backfill_pointeur",
  /** Reconstituée depuis les messages d'erreur de sync — indice, pas une preuve. */
  BACKFILL_SYNC_ERROR: "backfill_sync_error",
} as const;

export type OrigineTentative = (typeof ORIGINE_TENTATIVE)[keyof typeof ORIGINE_TENTATIVE];
