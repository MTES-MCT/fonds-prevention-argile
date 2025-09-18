import { useState, useEffect } from "react";
import {
  obtenirMonParcours,
  reinitialiserParcours,
} from "@/lib/actions/parcours.actions";

export default function StateMonitorPanel() {
  const [session, setSession] = useState<any>(null);
  const [parcours, setParcours] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Rafraîchissement automatique toutes les 5 secondes
  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      // Charger la session
      const sessionRes = await fetch("/api/debug/session");
      const sessionData = await sessionRes.json();
      setSession(sessionData);

      // Charger le parcours
      const parcoursRes = await obtenirMonParcours();
      if (parcoursRes.success) {
        setParcours(parcoursRes.data);
      }
    } catch (error) {
      console.error("Erreur chargement état:", error);
    }
  };

  const resetParcours = async () => {
    if (!confirm("Êtes-vous sûr de vouloir réinitialiser le parcours ?"))
      return;

    setIsLoading(true);
    try {
      await reinitialiserParcours();
      await loadData();
    } catch (error) {
      console.error("Erreur reset:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepBadgeColor = (step: string) => {
    const colors: Record<string, string> = {
      ELIGIBILITE: "#6a6af4",
      DIAGNOSTIC: "#ff9940",
      DEVIS: "#00a95f",
      FACTURES: "#000091",
    };
    return colors[step] || "#666666";
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      TODO: "#666666",
      EN_INSTRUCTION: "#ff9940",
      VALIDE: "#00a95f",
    };
    return colors[status] || "#666666";
  };

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">Contrôles</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Rafraîchissement auto (5s)
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            🔄 Rafraîchir
          </button>
          <button
            onClick={resetParcours}
            disabled={isLoading || !parcours}
            className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded disabled:opacity-50"
            style={{ borderColor: "#ce0500" }}
          >
            ⚠️ Reset parcours
          </button>
        </div>
      </div>

      {/* État de la session */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-bold mb-3 text-blue-900">🔐 Session utilisateur</h3>
        {session?.session ? (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-xs break-all">
                {session.session.userId}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">Rôle:</span>
              <span className="font-medium">{session.session.role}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">Méthode:</span>
              <span>{session.session.authMethod}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">Expire dans:</span>
              <span className="text-orange-600">
                {session.session.expiresAt &&
                  Math.round(
                    (new Date(session.session.expiresAt).getTime() -
                      Date.now()) /
                      1000 /
                      60
                  )}{" "}
                min
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Pas de session active</p>
        )}
      </div>

      {/* État du parcours */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-bold mb-3 text-blue-900">📋 Parcours</h3>
        {parcours ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">ID Parcours:</span>
              <span className="font-mono text-xs">
                {parcours.parcours?.id?.slice(0, 8)}...
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">Étape actuelle:</span>
              <span
                className="px-2 py-1 text-white text-xs rounded font-medium"
                style={{
                  backgroundColor: getStepBadgeColor(
                    parcours.parcours?.currentStep
                  ),
                }}
              >
                {parcours.parcours?.currentStep}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">Statut:</span>
              <span
                className="px-2 py-1 text-white text-xs rounded font-medium"
                style={{
                  backgroundColor: getStatusBadgeColor(
                    parcours.parcours?.currentStatus
                  ),
                }}
              >
                {parcours.parcours?.currentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">Progression:</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${parcours.progression}%`,
                      backgroundColor: "#00a95f",
                    }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {parcours.progression}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">Dossiers DS:</span>
              <span>{parcours.dossiers?.length || 0}</span>
            </div>

            {parcours.isComplete && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                ✅ Parcours terminé !
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Pas de parcours actif</p>
        )}
      </div>

      {/* Dossiers DS */}
      {parcours?.dossiers && parcours.dossiers.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold mb-3 text-blue-900">📁 Dossiers DS</h3>
          <div className="space-y-2">
            {parcours.dossiers.map((dossier: any) => (
              <div key={dossier.id} className="p-2 bg-gray-50 rounded text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{dossier.step}</span>
                  <span
                    className="px-2 py-1 text-xs rounded text-white"
                    style={{
                      backgroundColor: getStatusBadgeColor(dossier.dsStatus),
                    }}
                  >
                    {dossier.dsStatus}
                  </span>
                </div>
                {dossier.dsNumber && (
                  <div className="text-xs text-gray-600 mt-1">
                    N° {dossier.dsNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernière mise à jour */}
      <div className="text-center text-xs text-gray-500">
        Dernière MAJ: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
