"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentRole, useCanAccessAdministration, useCanAccessEspaceAgent } from "@/features/auth/hooks";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { ADMIN_NAV_TABS } from "@/features/backoffice/administration/shared/domain/value-objects/admin-nav.config";
import type { AdminNavTab } from "@/features/backoffice/administration/shared/domain/value-objects/admin-nav.config";
import { AGENT_TABS } from "@/features/backoffice/espace-agent/shared/domain/value-objects/amo-tabs.config";
import type { AmoTab } from "@/features/backoffice/espace-agent/shared/domain/types/amo-tab.types";
import { getNombreDossiersAction } from "@/features/backoffice/espace-agent/dossiers/actions";
import { CountBadge } from "@/shared/components/CountBadge";

/**
 * Navigation backoffice unifiée (ADR-0015).
 *
 * Deux rangées empilées dont la visibilité dépend du rôle (capacités), pas de l'URL :
 * - Rangée « Pilotage » (/administration) si `canAccessAdministration`.
 * - Rangée « Suivi des dossiers » (/espace-agent) si `canAccessEspaceAgent`.
 *
 * Garde de chemin : ne rend que dans le backoffice (le Header est partagé avec le
 * site public). La nav n'est qu'un affichage ; la barrière reste les gardes de
 * layout / page / Server Actions.
 */
const BACKOFFICE_PREFIXES = ["/administration", "/espace-agent"];

const ADMIN_ROOT = "/administration";

function isAdminTabActive(pathname: string, tab: AdminNavTab): boolean {
  if (tab.href === ADMIN_ROOT) return pathname === ADMIN_ROOT;
  return pathname.startsWith(tab.href);
}

function PilotageRow({ pathname, role }: { pathname: string; role: UserRole }) {
  const tabs = ADMIN_NAV_TABS.filter((tab) => !tab.minRoles || tab.minRoles.includes(role));
  // Onglet actif uniquement si l'URL appartient à l'administration (un seul item
  // actif sur l'union des deux rangées) ; le plus spécifique l'emporte, le root
  // ne match qu'en exact.
  const activeId = !pathname.startsWith(ADMIN_ROOT)
    ? null
    : (tabs.find((tab) => tab.href !== ADMIN_ROOT && pathname.startsWith(tab.href))?.id ??
      tabs.find((tab) => isAdminTabActive(pathname, tab))?.id ??
      null);

  return (
    <div className="fr-header__menu">
      <div className="fr-container">
        <nav className="fr-nav" id="admin-navigation" role="navigation" aria-label="Menu administration">
          <ul className="fr-nav__list">
            {tabs.map((tab) => (
              <li key={tab.id} className="fr-nav__item">
                <Link href={tab.href} className="fr-nav__link" aria-current={activeId === tab.id ? "page" : undefined}>
                  <span className={`${tab.icon} fr-icon--sm fr-mr-1v`} aria-hidden="true" />
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

const ESPACE_AGENT_ROOT = "/espace-agent";

function getAgentActiveTab(pathname: string, tabs: AmoTab[]): string | null {
  // Un seul onglet actif sur l'union des deux rangées : la rangée Dossiers ne
  // s'allume que si l'URL appartient à l'espace agent (sinon « Tableau de bord »
  // ET « Dossiers » apparaîtraient actifs simultanément sur /administration).
  if (!pathname.startsWith(ESPACE_AGENT_ROOT)) return null;
  const match = tabs.find((tab) => pathname.startsWith(tab.href));
  // Sur la racine /espace-agent, retomber sur le premier onglet (Dossiers).
  return match?.id ?? tabs[0]?.id ?? null;
}

function DossiersRow({ pathname }: { pathname: string }) {
  // Onglet unique (Dossiers) : les stats vivent désormais dans /administration.
  const tabs = AGENT_TABS;
  const activeTab = getAgentActiveTab(pathname, tabs);
  const [nombreDossiers, setNombreDossiers] = useState<number>(0);

  useEffect(() => {
    getNombreDossiersAction().then(setNombreDossiers);
  }, []);

  return (
    <div className="fr-header__menu">
      <div className="fr-container">
        <nav className="fr-nav" id="agent-navigation" role="navigation" aria-label="Menu suivi des dossiers">
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
      </div>
    </div>
  );
}

export function BackofficeNavigation() {
  const pathname = usePathname();
  const role = useAgentRole();
  const showAdmin = useCanAccessAdministration();
  const showAgent = useCanAccessEspaceAgent();

  // Garde de chemin : hors backoffice (site public), aucune barre.
  if (!BACKOFFICE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  if (!role || (!showAdmin && !showAgent)) {
    return null;
  }

  return (
    <>
      {showAdmin && <PilotageRow pathname={pathname} role={role as UserRole} />}
      {showAgent && <DossiersRow pathname={pathname} />}
    </>
  );
}
