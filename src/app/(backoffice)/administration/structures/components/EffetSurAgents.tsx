import { roleApres, type AgentDeStructure, type HabilitationsAdministrables } from "@/features/backoffice";
import { libelleRoleDeStructure } from "./libelles-role";
import { nommerAgents } from "./ModaleStructure";

interface EffetSurAgentsProps {
  habilitations: HabilitationsAdministrables;
  type: "amo" | "allersVers";
  operation: "ajout" | "retrait";
  nombreAgents: number;
  // Nommés au super-administrateur seulement.
  agents: AgentDeStructure[] | null;
}

/** Les rôles AMO et Aller-vers viennent de la structure : les changer change les droits de ses agents. */
export default function EffetSurAgents({ habilitations, type, operation, nombreAgents, agents }: EffetSurAgentsProps) {
  if (nombreAgents === 0) return null;

  const role = roleApres(habilitations, type, operation === "ajout");
  const pluriel = nombreAgents > 1;
  const sujet = pluriel ? `Ses ${nombreAgents} agents` : "Son agent";
  const effet = role
    ? `${pluriel ? "auront" : "aura"} le rôle ${libelleRoleDeStructure(role)}`
    : `${pluriel ? "n'auront" : "n'aura"} aucun rôle`;
  const moment = operation === "ajout" ? "dès cet ajout" : "dès ce retrait";

  return (
    <div className="fr-alert fr-alert--warning fr-alert--sm fr-mt-2w">
      <p>
        {sujet} {effet} {moment}
        {agents && agents.length > 0 ? ` : ${nommerAgents(agents)}.` : "."}
      </p>
    </div>
  );
}
