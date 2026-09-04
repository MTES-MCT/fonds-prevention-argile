import { pgTable, uuid, timestamp, varchar, integer, jsonb, index } from "drizzle-orm/pg-core";

/**
 * Une ligne par simulation de vulnérabilité RGA terminée (`/vulnerabilite-rga`), écrite
 * en best-effort au moment du résultat. Table strictement anonyme, volontairement :
 * pas de FK vers `users`, pas d'adresse en clair, pas de commune, pas de coordonnées,
 * pas d'identifiant de session/visiteur — seulement le code département (grain déjà
 * utilisé partout ailleurs pour de l'agrégat national) et les réponses/scores.
 * Alimente l'onglet /administration/vulnerabilite (répartition par réponse, score moyen).
 */
export const vulnerabiliteSimulations = pgTable(
  "vulnerabilite_simulations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),

    codeDepartement: varchar("code_departement", { length: 3 }),
    aleaRga: varchar("alea_rga", { length: 16 }),

    // Une colonne par critère répondu (pas un JSONB opaque) : simplifie et sécurise le
    // GROUP BY "répartition par réponse" côté service de stats.
    penteTerrain: varchar("pente_terrain", { length: 32 }),
    reseauxEnterres: varchar("reseaux_enterres", { length: 32 }),
    gravierProprete: varchar("gravier_proprete", { length: 32 }),
    gouttieres: varchar("gouttieres", { length: 32 }),
    arbreProximite: varchar("arbre_proximite", { length: 32 }),
    arbreEssence: varchar("arbre_essence", { length: 32 }),
    haies: varchar("haies", { length: 32 }),
    vegetationPiedFacade: varchar("vegetation_pied_facade", { length: 32 }),
    mitoyennete: varchar("mitoyennete", { length: 48 }),
    ensoleillement: varchar("ensoleillement", { length: 32 }),

    scoreGlobal: integer("score_global").notNull(),
    /** Record<CategorieVulnerabilite, number | null> — typé côté service, générique ici pour ne pas dépendre de la feature. */
    scoreParCategorie: jsonb("score_par_categorie").$type<Record<string, number | null>>(),
  },
  (table) => ({
    createdAtIdx: index("vulnerabilite_simulations_created_at_idx").on(table.createdAt),
    codeDepartementIdx: index("vulnerabilite_simulations_code_departement_idx").on(table.codeDepartement),
  })
);

export type VulnerabiliteSimulation = typeof vulnerabiliteSimulations.$inferSelect;
export type NewVulnerabiliteSimulation = typeof vulnerabiliteSimulations.$inferInsert;
