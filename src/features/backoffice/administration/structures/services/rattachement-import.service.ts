import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import {
  structuresRepository,
  type IdentiteStructure,
  type StructuresExecutor,
} from "@/shared/database/repositories/structures.repository";
import type { TypeStructure } from "@/shared/domain/value-objects";
import { fusionnerIdentite } from "../domain/regles-structures";

export interface RattachementImport {
  structureId: string;
  creee: boolean;
  /** Champs de la fiche que le fichier contredit, laissés tels quels. */
  ecarts: string[];
  /** Champs de la fiche remplacés par le fichier, quand l'import le demande. */
  remplacements: string[];
  nombreAgents: number;
}

export interface OptionsRattachement {
  type: TypeStructure;
  /** Structure déjà identifiée autrement que par le SIRET (Aller-vers sans SIRET). */
  structureDesignee?: string | null;
  remplacer?: boolean;
}

/** Structure d'une ligne d'import : celle désignée, sinon celle du SIRET et du type, sinon une nouvelle. */
export async function rattacherStructure(
  identite: IdentiteStructure,
  tx: StructuresExecutor,
  { type, structureDesignee = null, remplacer = false }: OptionsRattachement
): Promise<RattachementImport> {
  const structureId =
    structureDesignee ?? (identite.siret ? await structuresRepository.findIdBySiret(identite.siret, type, tx) : null);
  if (!structureId) {
    return {
      structureId: await structuresRepository.creer(identite, type, tx),
      creee: true,
      ecarts: [],
      remplacements: [],
      nombreAgents: 0,
    };
  }

  await structuresRepository.verrouiller(structureId, "exclusif", tx);
  const existante = await structuresRepository.findIdentite(structureId, tx);
  if (!existante) throw new Error("Structure introuvable");
  const fusion = fusionnerIdentite(existante, identite, remplacer);
  // Un SIRET déjà porté par une autre structure du même type ne peut pas compléter celle-ci.
  if (fusion.complements.includes("siret") && (await structuresRepository.findIdBySiret(identite.siret!, type, tx))) {
    fusion.identite.siret = existante.siret;
    fusion.complements = fusion.complements.filter((champ) => champ !== "siret");
    fusion.ecarts.push("SIRET");
  }
  if (fusion.complements.length > 0 || fusion.remplacements.length > 0) {
    await structuresRepository.mettreAJourIdentite(structureId, fusion.identite, tx);
  }
  return {
    structureId,
    creee: false,
    ecarts: fusion.ecarts,
    remplacements: fusion.remplacements,
    nombreAgents: await agentsRepository.compterParStructure(structureId, tx),
  };
}
