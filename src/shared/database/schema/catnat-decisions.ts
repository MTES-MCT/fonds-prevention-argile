import { pgTable, text, date, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const DECISIONS_CATNAT = ["reconnue", "non_reconnue"] as const;
export type DecisionCatnat = (typeof DECISIONS_CATNAT)[number];

/**
 * Décisions des arrêtés de catastrophe naturelle (sécheresse), commune par commune, refus compris.
 * Géorisques ne publie que les reconnaissances : celles-ci restent dans `catastrophes_naturelles`.
 */
export const catnatDecisions = pgTable(
  "catnat_decisions",
  {
    codeInsee: text("code_insee").notNull(),
    libelleCommune: text("libelle_commune").notNull(),

    dateArrete: date("date_arrete").notNull(),
    datePublicationJo: date("date_publication_jo").notNull(),

    // Période sur laquelle porte la demande de reconnaissance
    dateDebutEvt: date("date_debut_evt").notNull(),
    dateFinEvt: date("date_fin_evt").notNull(),

    decision: text("decision", { enum: DECISIONS_CATNAT }).notNull(),
    // Raison du refus résumée par la source ; vide pour une reconnaissance
    motif: text("motif"),

    // Jeu de données d'origine : une autre source pourra compléter l'historique sans toucher aux lignes de celle-ci
    source: text("source").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({
      name: "catnat_decisions_pk",
      columns: [table.codeInsee, table.dateArrete, table.dateDebutEvt],
    }),
  })
);

export type CatnatDecision = typeof catnatDecisions.$inferSelect;
export type NewCatnatDecision = typeof catnatDecisions.$inferInsert;
