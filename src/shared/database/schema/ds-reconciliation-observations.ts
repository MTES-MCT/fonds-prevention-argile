import { pgTable, uuid, timestamp, varchar, text, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { agents } from "./agents";
import { stepPgEnum } from "../enums/enums";
import type { CandidatDemandeur } from "@/features/parcours/dossiers-ds/domain/types/inspection.types";

/**
 * Ce que la réconciliation a constaté sur un dossier DN déposé, et ce qu'il en a été fait
 * (ADR-0027). Sans cette table, le rapport ne vit que dans la sortie d'un script : rien à
 * afficher dans le back-office, et aucun moyen de savoir si un cas a déjà été traité.
 *
 * Une ligne par dossier DN observé, mise à jour à chaque passage. Les dossiers sans rien à
 * signaler (déjà rattachés au bon parcours) n'y entrent pas.
 */
export const dsReconciliationObservations = pgTable(
  "ds_reconciliation_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Dossier DN observé. Unique : un dossier n'a qu'une observation courante. */
    dsNumber: varchar("ds_number", { length: 50 }).notNull().unique(),

    /** Parcours visé par l'annotation FPA — `null` quand le dossier n'en porte pas. */
    parcoursId: uuid("parcours_id").references(() => parcoursPrevention.id, { onDelete: "set null" }),
    step: stepPgEnum("step"),

    /** Verdict de `decideRattachement` (rattachement, conflit_*, sans_annotation…). */
    verdict: varchar("verdict", { length: 40 }).notNull(),
    /** État du dossier côté DN au moment de l'observation. */
    dsState: varchar("ds_state", { length: 30 }),
    /** Contexte utile à l'arbitrage : numéro du pointeur au moment du constat, par exemple. */
    detail: text("detail"),

    /**
     * Demandeurs qui correspondent au dossier, calculés au balayage (ADR-0027). Stockés pour
     * que la file les affiche sans re-interroger DN à chaque ouverture.
     */
    candidats: jsonb("candidats").$type<CandidatDemandeur[]>(),

    observedAt: timestamp("observed_at", { mode: "date" }).notNull().defaultNow(),

    /** Traité par un humain : rattaché, arbitré, ou écarté. */
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
    resolvedBy: uuid("resolved_by").references(() => agents.id, { onDelete: "set null" }),
    resolution: varchar("resolution", { length: 30 }),
  },
  (t) => [
    index("ds_reconciliation_observations_verdict_idx").on(t.verdict),
    index("ds_reconciliation_observations_parcours_idx").on(t.parcoursId),
  ]
);

export const dsReconciliationObservationsRelations = relations(dsReconciliationObservations, ({ one }) => ({
  parcours: one(parcoursPrevention, {
    fields: [dsReconciliationObservations.parcoursId],
    references: [parcoursPrevention.id],
  }),
}));

export type DsReconciliationObservation = typeof dsReconciliationObservations.$inferSelect;
export type NewDsReconciliationObservation = typeof dsReconciliationObservations.$inferInsert;

/** Comment un cas a été refermé. */
export const RESOLUTION_OBSERVATION = {
  /** Le dossier a été rattaché à son parcours. */
  RATTACHE: "rattache",
  /** Conflit tranché à la main (côté DN ou en base). */
  ARBITRE: "arbitre",
  /** Sans suite : dossier hors périmètre, doublon abandonné, test… */
  ECARTE: "ecarte",
  /** Refermé par un balayage : le cas n'a plus rien à signaler. */
  AUTO: "auto",
} as const;

export type ResolutionObservation = (typeof RESOLUTION_OBSERVATION)[keyof typeof RESOLUTION_OBSERVATION];
