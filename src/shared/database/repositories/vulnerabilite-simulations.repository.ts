import { eq, gte } from "drizzle-orm";
import { db } from "../client";
import {
  vulnerabiliteSimulations,
  type VulnerabiliteSimulation,
  type NewVulnerabiliteSimulation,
} from "../schema/vulnerabilite-simulations";

export class VulnerabiliteSimulationsRepository {
  /** Insère une ligne anonyme pour une simulation de vulnérabilité terminée. */
  async create(data: NewVulnerabiliteSimulation): Promise<VulnerabiliteSimulation> {
    const [row] = await db.insert(vulnerabiliteSimulations).values(data).returning();
    return row;
  }

  /** Utilisé pour résoudre le pointeur `parcours_prevention.vulnerabilite_simulation_id`. */
  async findById(id: string): Promise<VulnerabiliteSimulation | null> {
    const [row] = await db.select().from(vulnerabiliteSimulations).where(eq(vulnerabiliteSimulations.id, id));
    return row ?? null;
  }

  /**
   * Toutes les lignes créées depuis `debut`. Le service de stats en fait un seul passage
   * en mémoire (répartition par réponse + score moyen) plutôt que N requêtes GROUP BY —
   * même esprit que `computeEligibiliteCounts`, volumétrie attendue modeste.
   */
  async findSince(debut: Date): Promise<VulnerabiliteSimulation[]> {
    return db.select().from(vulnerabiliteSimulations).where(gte(vulnerabiliteSimulations.createdAt, debut));
  }
}

export const vulnerabiliteSimulationsRepository = new VulnerabiliteSimulationsRepository();
