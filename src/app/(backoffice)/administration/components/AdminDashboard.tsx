"use client";

import StatistiquesPanel from "./statistiques/StatistiquesPanel";
import AmoPanel from "./amo/AmoPanel";
import EligibilitePanel from "./eligibilite/EligibilitePanel";
import DiagnosticPanel from "./diagnostic/DiagnosticPanel";
import DevisPanel from "./devis/DevisPanel";
import FacturesPanel from "./factures/FacturesPanel";
import type { ActionResult } from "@/shared/types";
import type { DemarcheDetailed, DossiersConnection } from "@/features/parcours/dossiers-ds/adapters/graphql/types";
import UsersTrackingPanel from "./users/UsersTrackingPanel";
import AgentsPanel from "./agents/AgentsPanel";
import { useAgentRole } from "@/features/auth/hooks";
import { isSuperAdminRole } from "@/shared/domain/value-objects";
import { useAdminTab } from "@/features/backoffice";

interface DemarcheData {
  demarche: ActionResult<DemarcheDetailed>;
  schema: ActionResult<DemarcheDetailed>;
  dossiers: ActionResult<DossiersConnection>;
}

interface AdminDashboardProps {
  eligibiliteData: DemarcheData;
}

export default function AdminDashboard({ eligibiliteData }: AdminDashboardProps) {
  const { activeTab } = useAdminTab();
  const agentRole = useAgentRole();
  const isSuperAdmin = agentRole ? isSuperAdminRole(agentRole) : false;

  return (
    <>
      {/* Panel Statistiques */}
      <div className={activeTab === "statistiques" ? "" : "fr-hidden"} role="region" aria-label="Statistiques">
        <StatistiquesPanel />
      </div>

      {/* Panel Utilisateurs */}
      <div className={activeTab === "users" ? "" : "fr-hidden"} role="region" aria-label="Utilisateurs">
        {isSuperAdmin ? (
          <UsersTrackingPanel />
        ) : (
          <div className="fr-alert fr-alert--info">
            <p>Vous n'avez pas la permission d'accéder à cette section.</p>
          </div>
        )}
      </div>

      {/* Panel Agents */}
      <div className={activeTab === "agents" ? "" : "fr-hidden"} role="region" aria-label="Gestion des agents">
        {isSuperAdmin ? (
          <AgentsPanel />
        ) : (
          <div className="fr-alert fr-alert--info">
            <p>Vous n'avez pas la permission d'accéder à cette section.</p>
          </div>
        )}
      </div>

      {/* Panel Entreprises AMO */}
      <div className={activeTab === "amo" ? "" : "fr-hidden"} role="region" aria-label="Entreprises AMO">
        {isSuperAdmin ? (
          <AmoPanel />
        ) : (
          <div className="fr-alert fr-alert--info">
            <p>Vous n'avez pas la permission d'accéder à cette section.</p>
          </div>
        )}
      </div>

      {/* Panel Eligibilite */}
      <div className={activeTab === "eligibilite" ? "" : "fr-hidden"} role="region" aria-label="Eligibilité">
        <EligibilitePanel
          demarcheResponse={eligibiliteData.demarche}
          schemaResponse={eligibiliteData.schema}
          dossiersResponse={eligibiliteData.dossiers}
        />
      </div>

      {/* Panel Diagnostic */}
      <div className={activeTab === "diagnostic" ? "" : "fr-hidden"} role="region" aria-label="Diagnostic">
        <DiagnosticPanel />
      </div>

      {/* Panel Devis */}
      <div className={activeTab === "devis" ? "" : "fr-hidden"} role="region" aria-label="Devis">
        <DevisPanel />
      </div>

      {/* Panel Factures */}
      <div className={activeTab === "factures" ? "" : "fr-hidden"} role="region" aria-label="Factures">
        <FacturesPanel />
      </div>
    </>
  );
}
