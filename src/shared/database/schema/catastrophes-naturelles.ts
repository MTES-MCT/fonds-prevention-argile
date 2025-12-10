import { pgTable, text, date, index, timestamp } from "drizzle-orm/pg-core";

/**
 * Table des catastrophes naturelles (CATNAT)
 * Source: API Georisques - https://www.georisques.gouv.fr/doc-api
 */
export const catastrophesNaturelles = pgTable(
  "catastrophes_naturelles",
  {
    // Identifiant unique de l'arrêté de catastrophe naturelle
    codeNationalCatnat: text("code_national_catnat").primaryKey(),

    // Dates de l'événement
    dateDebutEvt: date("date_debut_evt").notNull(),
    dateFinEvt: date("date_fin_evt").notNull(),

    // Dates de publication
    datePublicationArrete: date("date_publication_arrete").notNull(),
    datePublicationJo: date("date_publication_jo").notNull(),

    // Type de risque (ex: "Sécheresse", "Inondation", etc.)
    libelleRisqueJo: text("libelle_risque_jo").notNull(),

    // Localisation
    codeInsee: text("code_insee").notNull(),
    libelleCommune: text("libelle_commune").notNull(),

    // Métadonnées
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Index pour les requêtes par commune
    codeInseeIdx: index("catastrophes_naturelles_code_insee_idx").on(table.codeInsee),

    // Index pour les requêtes par date
    dateDebutEvtIdx: index("catastrophes_naturelles_date_debut_evt_idx").on(table.dateDebutEvt),

    // Index composite pour optimiser les requêtes commune + date
    codeInseeDateIdx: index("catastrophes_naturelles_code_insee_date_idx").on(table.codeInsee, table.dateDebutEvt),

    // Index pour les requêtes par type de risque
    libelleRisqueIdx: index("catastrophes_naturelles_libelle_risque_idx").on(table.libelleRisqueJo),
  })
);

export type CatastropheNaturelle = typeof catastrophesNaturelles.$inferSelect;
export type NewCatastropheNaturelle = typeof catastrophesNaturelles.$inferInsert;
