"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentRole } from "@/features/auth/hooks";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AGENT_TABS } from "@/features/backoffice/espace-agent/shared/domain/value-objects/amo-tabs.config";
import type { AmoTab } from "@/features/backoffice/espace-agent/shared/domain/types/amo-tab.types";
import { getNombreDossiersAction } from "@/features/backoffice/espace-agent/dossiers/actions";
import { CountBadge } from "@/shared/components/CountBadge";

function getActiveTab(pathname: string, tabs: AmoTab[]): string | null {
  for (const tab of tabs) {
    if (pathname.startsWith(tab.href)) {
      return tab.id;
    }
  }
  return tabs[0]?.id ?? null;
}

function AgentNavigationTabs({ tabs }: { tabs: AmoTab[] }) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname, tabs);
  const [nombreDossiers, setNombreDossiers] = useState<number>(0);

  useEffect(() => {
    getNombreDossiersAction().then(setNombreDossiers);
  }, []);

  return (
    <nav className="fr-nav" id="agent-navigation" role="navigation" aria-label="Menu espace agent">
      <ul className="fr-nav__list">
        {tabs.map((tab) => (
          <li key={tab.id} className="fr-nav__item">
            <Link href={tab.href} className="fr-nav__link" aria-current={activeTab === tab.id ? "page" : undefined}>
              {tab.label}
              {tab.id === "dossiers" && <CountBadge count={nombreDossiers} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Barre d'onglets « Dossiers / Statistiques » de l'espace agent.
 * Identique pour AMO, AV, hybride, et SUPER_ADMIN (sur /espace-agent/**).
 */
export function AgentNavigation() {
  const agentRole = useAgentRole();
  const pathname = usePathname();

  if (!agentRole) {
    return null;
  }

  // Barre propre à l'espace agent : sinon elle déborde sur /administration pour l'analyste national.
  if (!pathname.startsWith("/espace-agent")) {
    return null;
  }

  // ANALYSTE inclus : seul un départemental atteint l'espace agent (le national est redirigé par le layout).
  const isAgentRole =
    agentRole === UserRole.AMO ||
    agentRole === UserRole.ALLERS_VERS ||
    agentRole === UserRole.AMO_ET_ALLERS_VERS ||
    agentRole === UserRole.ANALYSTE ||
    agentRole === UserRole.SUPER_ADMINISTRATEUR;

  if (!isAgentRole) {
    return null;
  }

  // L'analyste ne suit que des dossiers ici ; ses stats sont dans /administration
  // (l'onglet Statistiques de l'espace agent est AMO-centré, sans objet pour lui).
  const tabs = agentRole === UserRole.ANALYSTE ? AGENT_TABS.filter((tab) => tab.id !== "statistiques") : AGENT_TABS;

  return (
    <div className="fr-header__menu">
      <div className="fr-container">
        <AgentNavigationTabs tabs={tabs} />
      </div>
    </div>
  );
}
