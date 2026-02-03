"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentRole } from "@/features/auth/hooks";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import {
  AMO_TABS,
  ALLERS_VERS_TABS,
  AMO_ET_ALLERS_VERS_TABS,
} from "@/features/backoffice/espace-agent/shared/domain/value-objects/amo-tabs.config";
import type { AmoTab } from "@/features/backoffice/espace-agent/shared/domain/types/amo-tab.types";
import { getNombreDemandesEnAttenteAction } from "@/features/backoffice/espace-agent/accueil/actions";
import { CountBadge } from "@/shared/components/CountBadge";

/**
 * Détermine l'onglet actif selon le pathname
 */
function getActiveTab(pathname: string, tabs: AmoTab[]): string | null {
  // Chercher une correspondance exacte ou par préfixe
  for (const tab of tabs) {
    if (tab.href === "/espace-agent") {
      // Pour l'accueil, correspondance exacte ou validation
      if (pathname === tab.href || pathname.startsWith("/espace-agent/validation")) {
        return tab.id;
      }
    } else if (pathname.startsWith(tab.href)) {
      return tab.id;
    }
  }
  return tabs[0]?.id || null;
}

/**
 * Navigation Agent unifiée
 * Affiche les onglets selon le rôle de l'agent
 */
function AgentNavigationTabs({ tabs, showDemandesBadge }: { tabs: AmoTab[]; showDemandesBadge: boolean }) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname, tabs);
  const [nombreDemandesEnAttente, setNombreDemandesEnAttente] = useState<number>(0);

  useEffect(() => {
    if (!showDemandesBadge) return;

    async function loadNombreDemandes() {
      const count = await getNombreDemandesEnAttenteAction();
      setNombreDemandesEnAttente(count);
    }

    loadNombreDemandes();
  }, [showDemandesBadge]);

  return (
    <nav className="fr-nav" id="agent-navigation" role="navigation" aria-label="Menu espace agent">
      <ul className="fr-nav__list">
        {tabs.map((tab) => (
          <li key={tab.id} className="fr-nav__item">
            <Link href={tab.href} className="fr-nav__link" aria-current={activeTab === tab.id ? "page" : undefined}>
              {tab.label}
              {showDemandesBadge && tab.id === "accueil" && <CountBadge count={nombreDemandesEnAttente} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Navigation conditionnelle selon le rôle de l'agent
 *
 * Affiche une barre de navigation spécifique sous le header
 * selon le rôle de l'agent connecté (AMO, Allers-Vers, AMO et Allers-Vers).
 */
export function AgentNavigation() {
  const agentRole = useAgentRole();

  // Pas de navigation spéciale si pas agent ou rôle non supporté
  if (!agentRole) {
    return null;
  }

  // Déterminer les onglets et options selon le rôle
  let tabs: AmoTab[] = [];
  let showDemandesBadge = false;

  switch (agentRole) {
    case UserRole.AMO:
      tabs = AMO_TABS;
      showDemandesBadge = true;
      break;

    case UserRole.ALLERS_VERS:
      tabs = ALLERS_VERS_TABS;
      showDemandesBadge = false;
      break;

    case UserRole.AMO_ET_ALLERS_VERS:
      tabs = AMO_ET_ALLERS_VERS_TABS;
      showDemandesBadge = true;
      break;

    default:
      // Pas de navigation pour les autres rôles (ADMIN, ANALYSTE, etc.)
      return null;
  }

  return (
    <div className="fr-header__menu">
      <div className="fr-container">
        <AgentNavigationTabs tabs={tabs} showDemandesBadge={showDemandesBadge} />
      </div>
    </div>
  );
}
