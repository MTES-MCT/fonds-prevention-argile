import { gte } from "drizzle-orm";
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
