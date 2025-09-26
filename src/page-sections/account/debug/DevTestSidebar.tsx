import { useState, useEffect } from "react";
import UserStatePanel from "./UserStatePanel";
import MockDSPanel from "./MockDsPanel";
import { isDevelopment, isStaging } from "@/lib/config/env.config";

export default function DevTestSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // Ne pas afficher si pas en dev ou staging
  if (!isDevelopment() && !isStaging()) {
    return null;
  }

  return (
    <>
      {/* Bouton flottant pour ouvrir le panneau */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 z-40 fr-btn fr-btn--secondary fr-btn--icon-left shadow-lg"
        title="Ouvrir les outils de développement"
      >
        <span
          className="fr-icon-settings-5-line fr-mr-1w"
          aria-hidden="true"
        ></span>
        Outils de développement
      </button>

      {/* Panneau latéral */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-white shadow-2xl z-[9999] 
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          w-full sm:w-96 md:w-[480px] lg:w-[600px]
        `}
        style={{
          borderLeft: "4px solid var(--border-action-high-blue-france)",
        }}
      >
        {/* Header du panneau */}
        <div className="fr-container--fluid">
          <div
            className="fr-grid-row fr-grid-row--gutters fr-grid-row--middle fr-p-3w"
            style={{ backgroundColor: "var(--background-alt-grey)" }}
          >
            <div className="fr-col">
              <h2 className="fr-h4 fr-mb-0">
                <span
                  className="fr-icon-bug-line fr-mr-1w"
                  aria-hidden="true"
                ></span>
                Outils de développement
              </h2>
            </div>
            <div className="fr-col-auto">
              <button
                onClick={() => setIsOpen(false)}
                className="fr-btn--close fr-btn"
                title="Fermer"
                aria-label="Fermer les outils de développement"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div
          className="overflow-y-auto fr-p-3w"
          style={{
            height: "calc(100vh - 140px)",
            backgroundColor: "var(--background-default-grey)",
          }}
        >
          {/* Section 1: Visualisation de l'état utilisateur */}
          <div className="fr-mb-4w">
            <UserStatePanel />
          </div>

          {/* Section 2: Mock Démarches Simplifiées */}
          <div className="fr-mb-3w">
            <MockDSPanel />
          </div>
        </div>

        {/* Footer avec infos */}
        <div
          className="fr-container--fluid fr-p-2w"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "var(--background-alt-grey)",
            borderTop: "1px solid var(--border-default-grey)",
          }}
        >
          <div className="fr-grid-row fr-grid-row--middle">
            <div className="fr-col">
              <p className="fr-text--xs fr-mb-0 fr-text--regular">
                <span
                  className="fr-mr-1v"
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "var(--text-default-success)",
                    animation: "pulse 2s infinite",
                  }}
                ></span>
                Mode développement • {process.env.NODE_ENV}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}
