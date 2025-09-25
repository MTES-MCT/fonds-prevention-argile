import { useState, useEffect } from "react";
import StateMonitorPanel from "./StateMonitorPanel";
import MockDSPanel from "./MockDsPanel";
import { isDevelopment, isStaging } from "@/lib/config/env.config";

export default function DevTestSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"mockds" | "state">("mockds");

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
        className="fixed right-4 bottom-4 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
        title="Ouvrir les outils de développement"
        style={{ backgroundColor: "#000091" }}
      >
        <span className="text-white">Outils de développement</span>
      </button>

      {/* Pas d'overlay, juste le panneau */}

      {/* Panneau latéral */}
      <div
        className={`
        fixed top-0 right-0 h-full bg-white border-l-4 shadow-2xl z-[9999] transition-transform duration-300 ease-in-out overflow-hidden
        ${isOpen ? "translate-x-0" : "translate-x-full"}
        w-full sm:w-96 md:w-[480px] lg:w-[600px]
      `}
        style={{ borderLeftColor: "#000091" }}
      >
        {/* Header du panneau */}
        <div className="bg-gray-100 text-gray-900 p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🛠️ Outils de développement
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Fermer"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {/* Tab pour le mock de DS */}
            <button
              onClick={() => setActiveTab("mockds")}
              className={`
    px-4 py-2 rounded-lg transition-all
    ${
      activeTab === "mockds"
        ? "bg-blue-600 text-white! font-medium"
        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
    }
  `}
              style={
                activeTab === "mockds" ? { backgroundColor: "#000091" } : {}
              }
            >
              Mock DS
            </button>

            {/* Tab pour le mock de l'Etat */}
            <button
              onClick={() => setActiveTab("state")}
              className={`
                px-4 py-2 rounded-lg transition-all
                ${
                  activeTab === "state"
                    ? "bg-blue-600 text-white! font-medium"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }
              `}
              style={
                activeTab === "state" ? { backgroundColor: "#000091" } : {}
              }
            >
              État actuel
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="h-[calc(100vh-140px)] overflow-y-auto p-4 bg-gray-50">
          {activeTab === "mockds" && <MockDSPanel />}
          {activeTab === "state" && <StateMonitorPanel />}
        </div>

        {/* Footer avec infos */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-100 border-t px-4 py-2">
          <p className="text-xs text-gray-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Mode développement • Environnement : {process.env.NODE_ENV}
          </p>
        </div>
      </div>
    </>
  );
}
