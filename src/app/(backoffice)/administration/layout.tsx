"use client";

import { ReactNode } from "react";
import AdminSideMenu from "./components/AdminSideMenu";
import Footer from "@/shared/components/Footer/Footer";
import { AdminProvider } from "@/features/backoffice";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminProvider>
      <div className="fr-container-fluid" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div className="fr-grid-row" style={{ flex: 1 }}>
          {/* Menu latéral - sticky avec séparateur sur toute la hauteur */}
          <div
            className="fr-col-12 fr-col-md-3 fr-col-lg-2"
            style={{
              minWidth: "250px",
              maxWidth: "280px",
              borderRight: "1px solid var(--border-default-grey)",
            }}>
            <div style={{ position: "sticky", top: "0", height: "100vh", overflowY: "auto" }}>
              <AdminSideMenu />
            </div>
          </div>

          {/* Contenu principal - pleine largeur restante */}
          <div className="fr-col-12 fr-col-md-9 fr-col-lg-10" style={{ flex: 1 }}>
            <div className="fr-py-6w bg-[var(--background-alt-blue-france)]">{children}</div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </AdminProvider>
  );
}
