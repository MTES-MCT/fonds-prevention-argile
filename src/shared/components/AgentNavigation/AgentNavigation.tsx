"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentRole } from "@/features/auth/hooks";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AGENT_TABS } from "@/features/backoffice/espace-agent/shared/domain/value-objects/amo-tabs.config";
import type { AmoTab } from "@/features/backoffice/espace-agent/shared/domain/types/amo-tab.types";

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

  return (
    <nav className="fr-nav" id="agent-navigation" role="navigation" aria-label="Menu espace agent">
      <ul className="fr-nav__list">
        {tabs.map((tab) => (
          <li key={tab.id} className="fr-nav__item">
            <Link href={tab.href} className="fr-nav__link" aria-current={activeTab === tab.id ? "page" : undefined}>
              {tab.label}
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

  const isAgentRole =
    agentRole === UserRole.AMO ||
    agentRole === UserRole.ALLERS_VERS ||
    agentRole === UserRole.AMO_ET_ALLERS_VERS;

  const isSuperAdminOnAgentRoute =
    agentRole === UserRole.SUPER_ADMINISTRATEUR && pathname.startsWith("/espace-agent");

  if (!isAgentRole && !isSuperAdminOnAgentRoute) {
    return null;
  }

  return (
    <div className="fr-header__menu">
      <div className="fr-container">
        <AgentNavigationTabs tabs={AGENT_TABS} />
      </div>
    </div>
  );
}
