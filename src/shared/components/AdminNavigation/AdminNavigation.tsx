"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentRole } from "@/features/auth/hooks";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { ADMIN_NAV_TABS } from "@/features/backoffice/administration/shared/domain/value-objects/admin-nav.config";
import type { AdminNavTab } from "@/features/backoffice/administration/shared/domain/value-objects/admin-nav.config";

/** Rôles ayant accès au menu horizontal d'administration */
const ADMIN_NAV_ROLES: string[] = [
  UserRole.SUPER_ADMINISTRATEUR,
  UserRole.ADMINISTRATEUR,
  UserRole.ANALYSTE,
  UserRole.ANALYSTE_DDT,
];

function getActiveTab(pathname: string, tabs: AdminNavTab[]): string | null {
  // Correspondance exacte pour la racine "/administration"
  if (pathname === "/administration") {
    return tabs.find((tab) => tab.href === "/administration")?.id ?? null;
  }
  // Correspondance par prefixe pour les sous-routes
  for (const tab of tabs) {
    if (tab.href !== "/administration" && pathname.startsWith(tab.href)) {
      return tab.id;
    }
  }
  return tabs[0]?.id ?? null;
}

/**
 * Navigation horizontale pour l'administration
 *
 * Affiche une barre de navigation DSFR sous le header,
 * visible pour tous les rôles ayant accès à /administration.
 */
export function AdminNavigation() {
  const agentRole = useAgentRole();
  const pathname = usePathname();

  if (!agentRole || !ADMIN_NAV_ROLES.includes(agentRole)) {
    return null;
  }

  const visibleTabs = ADMIN_NAV_TABS.filter((tab) => !tab.minRoles || tab.minRoles.includes(agentRole as UserRole));
  const activeTab = getActiveTab(pathname, visibleTabs);

  return (
    <div className="fr-header__menu">
      <div className="fr-container">
        <nav className="fr-nav" id="admin-navigation" role="navigation" aria-label="Menu administration">
          <ul className="fr-nav__list">
            {visibleTabs.map((tab) => (
              <li key={tab.id} className="fr-nav__item">
                <Link href={tab.href} className="fr-nav__link" aria-current={activeTab === tab.id ? "page" : undefined}>
                  <span className={`${tab.icon} fr-mr-1v`} aria-hidden="true" />
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
