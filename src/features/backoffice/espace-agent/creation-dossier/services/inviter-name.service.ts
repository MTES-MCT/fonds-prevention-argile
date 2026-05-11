import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { agents, allersVers, entreprisesAmo } from "@/shared/database/schema";

/**
 * Calcule le nom à afficher comme "inviteur" dans l'email envoyé au demandeur.
 * Priorité : structure Allers-vers > entreprise AMO > nom complet de l'agent.
 *
 * Utilisé pour les emails d'invitation (parcours AV / AMO).
 */
export async function getInviterName(agentId: string): Promise<string> {
  const [row] = await db
    .select({
      givenName: agents.givenName,
      usualName: agents.usualName,
      allersVersNom: allersVers.nom,
      entrepriseAmoNom: entreprisesAmo.nom,
    })
    .from(agents)
    .leftJoin(allersVers, eq(agents.allersVersId, allersVers.id))
    .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!row) return "Votre interlocuteur";

  if (row.allersVersNom) return row.allersVersNom;
  if (row.entrepriseAmoNom) return row.entrepriseAmoNom;

  const fullName = `${row.givenName ?? ""} ${row.usualName ?? ""}`.trim();
  return fullName.length > 0 ? fullName : "Votre interlocuteur";
}
