"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentRole } from "@/features/auth/hooks";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AMO_TABS } from "@/features/backoffice/espace-amo/shared/domain/value-objects/amo-tabs.config";
import type { AmoTab } from "@/features/backoffice/espace-amo/shared/domain/types/amo-tab.types";
import { getNombreDemandesEnAttenteAction } from "@/features/backoffice/espace-amo/accueil/actions";
import { CountBadge } from "@/shared/components/CountBadge";

/**
 * Détermine l'onglet actif selon le pathname
 * TODO : Simplifier cette logique & mutualiser
 */
function getActiveTab(pathname: string, tabs: AmoTab[]): string | null {
  // Chercher une correspondance exacte ou par préfixe
  for (const tab of tabs) {
    if (tab.href === "/espace-amo") {
      // Pour l'accueil, correspondance exacte ou validation
      if (pathname === tab.href || pathname.startsWith("/espace-amo/validation")) {
        return tab.id;
      }
    } else if (pathname.startsWith(tab.href)) {
      return tab.id;
    }
  }
  return tabs[0]?.id || null;
}

/**
 * Navigation AMO
 */
function AmoNavigation() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname, AMO_TABS);
  const [nombreDemandesEnAttente, setNombreDemandesEnAttente] = useState<number>(0);

  useEffect(() => {
    async function loadNombreDemandes() {
      const count = await getNombreDemandesEnAttenteAction();
      setNombreDemandesEnAttente(count);
    }

    loadNombreDemandes();
  }, []);

  return (
    <nav className="fr-nav" id="amo-navigation" role="navigation" aria-label="Menu espace AMO">
      <ul className="fr-nav__list">
        {AMO_TABS.map((tab) => (
          <li key={tab.id} className="fr-nav__item">
            <Link href={tab.href} className="fr-nav__link" aria-current={activeTab === tab.id ? "page" : undefined}>
              {tab.label}
              {tab.id === "accueil" && <CountBadge count={nombreDemandesEnAttente} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Navigation conditionnelle selon le rôle de l'utilisateur
 *
 * Affiche une barre de navigation spécifique sous le header
 * selon le rôle de l'agent connecté.
 *
 * Extensible pour d'autres rôles à l'avenir.
 */
export function RoleNavigation() {
  const agentRole = useAgentRole();

  // Pas de navigation spéciale si pas agent ou rôle non supporté
  if (!agentRole) {
    return null;
  }

  switch (agentRole) {
    case UserRole.AMO:
      return (
        <div className="fr-header__menu">
          <div className="fr-container">
            <AmoNavigation />
          </div>
        </div>
      );

    // Prévu pour d'autres rôles à l'avenir
    // case UserRole.ADMINISTRATEUR:
    // case UserRole.SUPER_ADMINISTRATEUR:
    //   return <AdminNavigation />;

    default:
      return null;
  }
}
