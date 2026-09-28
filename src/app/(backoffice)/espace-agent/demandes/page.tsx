import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { DemandesAccompagnementPanel } from "./components/DemandesAccompagnementPanel";

/**
 * Espace Agent - Page des demandes AMO
 */
export default async function EspaceAgentDemandesPage() {
  await exigerAccesEspaceAgent();
  return <DemandesAccompagnementPanel />;
}
