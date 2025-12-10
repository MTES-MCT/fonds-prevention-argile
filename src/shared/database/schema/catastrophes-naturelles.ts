import { pgTable, text, date, index, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Table des catastrophes naturelles (CATNAT)
 * Source: API Georisques - https://www.georisques.gouv.fr/doc-api
 *
 * Note: Une même catastrophe (même code_national_catnat) peut concerner plusieurs communes
 * La clé primaire est donc composite: (code_national_catnat, code_insee)
 */
export const catastrophesNaturelles = pgTable(
  "catastrophes_naturelles",
  {
    // Identifiant de l'arrêté de catastrophe naturelle
    codeNationalCatnat: text("code_national_catnat").notNull(),

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
    // Clé primaire composite
    pk: primaryKey({ columns: [table.codeNationalCatnat, table.codeInsee] }),

    // Index pour les requêtes par commune
    codeInseeIdx: index("catastrophes_naturelles_code_insee_idx").on(table.codeInsee),

    // Index pour les requêtes par date
    dateDebutEvtIdx: index("catastrophes_naturelles_date_debut_evt_idx").on(table.dateDebutEvt),

    // Index composite pour optimiser les requêtes commune + date
    codeInseeDateIdx: index("catastrophes_naturelles_code_insee_date_idx").on(table.codeInsee, table.dateDebutEvt),

    // Index pour les requêtes par type de risque
    libelleRisqueIdx: index("catastrophes_naturelles_libelle_risque_idx").on(table.libelleRisqueJo),

    // Index pour les requêtes par code national
    codeNationalIdx: index("catastrophes_naturelles_code_national_idx").on(table.codeNationalCatnat),
  })
);

export type CatastropheNaturelle = typeof catastrophesNaturelles.$inferSelect;
export type NewCatastropheNaturelle = typeof catastrophesNaturelles.$inferInsert;
