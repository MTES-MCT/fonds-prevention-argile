"use client";

import Link from "next/link";
import { useAmoTab, AMO_TABS } from "@/features/backoffice/espace-amo";

/**
 * Navigation horizontale pour l'espace AMO
 */
export function AmoNavigation() {
  const { activeTab } = useAmoTab();

  return (
    <nav className="fr-tabs" role="navigation" aria-label="Navigation espace AMO">
      <ul className="fr-tabs__list" role="tablist">
        {AMO_TABS.map((tab) => (
          <li key={tab.id} role="presentation">
            <Link
              href={tab.href}
              className="fr-tabs__tab"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-current={activeTab === tab.id ? "page" : undefined}>
              <span className={`${tab.icon} fr-mr-1w`} aria-hidden="true" />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
