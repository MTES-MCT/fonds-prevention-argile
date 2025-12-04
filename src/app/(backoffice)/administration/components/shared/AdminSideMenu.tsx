"use client";

import { ADMIN_TABS } from "@/features/backoffice/administration/domain/value-objects/admin-tabs.config";
import { useAdminTab } from "@/features/backoffice";

export default function AdminSideMenu() {
  const { activeTab, setActiveTab } = useAdminTab();

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
            {ADMIN_TABS.map((link) => (
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
