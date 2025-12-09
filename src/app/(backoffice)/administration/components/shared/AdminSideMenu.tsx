"use client";

import { ADMIN_TABS, useAdminTab } from "@/features/backoffice";
import { useAuth } from "@/features/auth/client";
import { canAccessTab } from "@/features/auth/permissions/services/rbac.service";
import type { UserRole } from "@/shared/domain/value-objects";
import { useMemo } from "react";

export default function AdminSideMenu() {
  const { activeTab, setActiveTab } = useAdminTab();
  const { user } = useAuth();

  const visibleTabs = useMemo(() => {
    if (!user) return [];
    return ADMIN_TABS.filter((tab) => canAccessTab(user.role as UserRole, tab.id));
  }, [user]);

  return (
    <nav className="fr-sidemenu fr-px-4w" role="navigation" aria-label="Menu d'administration">
      <div className="fr-sidemenu__inner" style={{ boxShadow: "none" }}>
        <button
          aria-expanded="false"
          aria-controls="admin-sidemenu-collapse"
          type="button"
          className="fr-sidemenu__btn">
          Menu
        </button>
        <div className="fr-collapse" id="admin-sidemenu-collapse">
          <div className="fr-sidemenu__title fr-mt-4w">
            <span className="fr-icon-settings-5-line fr-mr-2v" />
            Administration
          </div>
          <ul className="fr-sidemenu__list">
            {visibleTabs.map((link) => (
              <li key={link.id} className="fr-sidemenu__item">
                <button
                  type="button"
                  className="fr-sidemenu__link"
                  aria-current={activeTab === link.id ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(link.id);
                  }}>
                  <span className={`${link.icon} fr-mr-2v`} aria-hidden="true" />
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
