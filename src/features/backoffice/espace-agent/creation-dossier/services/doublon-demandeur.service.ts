import { desc, eq, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursPrevention, users } from "@/shared/database/schema";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import { resolveEspaceAgentPath } from "@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service";
import { presenterDoublon, type DoublonDemandeur, type MotifDoublon } from "../domain/doublon";

export interface CritereDoublon {
  email: string;
  adresse?: { clefBan?: string | null; label?: string | null };
}

interface DoublonTrouve {
  motif: MotifDoublon;
  parcoursId: string | null;
}

const adresseNormalisee = (colonne: SQL) => sql`regexp_replace(lower(trim(${colonne})), '\\s+', ' ', 'g')`;

async function chercherParEmail(email: string): Promise<DoublonTrouve | null> {
  const [compte] = await db
    .select({ fcId: users.fcId, parcoursId: parcoursPrevention.id })
    .from(users)
    .leftJoin(parcoursPrevention, eq(parcoursPrevention.userId, users.id))
    .where(or(sql`LOWER(${users.email}) = LOWER(${email})`, sql`LOWER(${users.emailContact}) = LOWER(${email})`))
    // Un compte FranceConnect prime sur une invitation en attente pour le même email.
    .orderBy(sql`${users.fcId} IS NULL`, desc(users.createdAt))
    .limit(1);
  if (!compte) return null;
  return { motif: compte.fcId ? "compte" : "invitation", parcoursId: compte.parcoursId };
}

async function chercherParAdresse(adresse: NonNullable<CritereDoublon["adresse"]>): Promise<DoublonTrouve | null> {
  const conditions: SQL[] = [];
  for (const colonne of [parcoursPrevention.rgaSimulationData, parcoursPrevention.rgaSimulationDataAgent]) {
    if (adresse.clefBan) conditions.push(sql`${colonne} #>> '{logement,clef_ban}' = ${adresse.clefBan}`);
    if (adresse.label?.trim()) {
      conditions.push(
        sql`${adresseNormalisee(sql`${colonne} #>> '{logement,adresse}'`)} = ${adresseNormalisee(sql`${adresse.label}`)}`
      );
    }
  }
  if (conditions.length === 0) return null;

  const [parcours] = await db
    .select({ id: parcoursPrevention.id })
    .from(parcoursPrevention)
    .where(or(...conditions))
    .orderBy(desc(parcoursPrevention.createdAt))
    .limit(1);
  return parcours ? { motif: "adresse", parcoursId: parcours.id } : null;
}

/** Cherche un demandeur déjà connu, par email puis par logement. */
export async function detecterDoublonDemandeur(critere: CritereDoublon): Promise<DoublonTrouve | null> {
  return (
    (await chercherParEmail(critere.email)) ?? (critere.adresse ? await chercherParAdresse(critere.adresse) : null)
  );
}

/** Message à l'agent, avec le lien du dossier existant seulement s'il peut l'ouvrir. */
export async function presenterDoublonPourAgent(
  doublon: DoublonTrouve,
  agent: AgentScopeInput
): Promise<DoublonDemandeur> {
  if (!doublon.parcoursId) return presenterDoublon(doublon.motif, null);
  const refus = await verifyProspectTerritoryAccess(doublon.parcoursId, agent);
  const lien = refus ? null : await resolveEspaceAgentPath(doublon.parcoursId);
  return presenterDoublon(doublon.motif, lien);
}
