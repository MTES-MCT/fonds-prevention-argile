import { useState } from "react";
import { syncUserDossierStatus } from "@/lib/actions/demarches-simplifies/sync.actions";

interface SyncResult {
  success: boolean;
  data?: {
    updated: boolean;
    oldStatus?: string;
    newStatus?: string;
    shouldRefresh: boolean;
    isBrouillon?: boolean;
  };
  error?: string;
}

export default function MockDSPanel() {
  const [selectedStatus, setSelectedStatus] = useState("en_construction");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const mockEnabled = process.env.NEXT_PUBLIC_USE_DS_MOCK === "true";

  const statusOptions = [
    { value: "en_construction", label: "📝 En construction", color: "#3a3a3a" },
    { value: "en_instruction", label: "⏳ En instruction", color: "#6a6af4" },
    { value: "accepte", label: "✅ Accepté", color: "#18753c" },
    { value: "refuse", label: "❌ Refusé", color: "#ce0500" },
    { value: "sans_suite", label: "⚠️ Classé sans suite", color: "#666666" },
  ];

  const currentOption = statusOptions.find(
    (opt) => opt.value === selectedStatus
  );

  const handleSetMockStatus = async () => {
    try {
      const response = await fetch("/api/test/mock-ds-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (response.ok) {
        console.log(`✅ Mock DS: Statut défini sur "${selectedStatus}"`);
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await syncUserDossierStatus();
      setSyncResult(result);
    } catch (error) {
      setSyncResult({ success: false, error: String(error) });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!mockEnabled) {
    return (
      <div className="fr-alert fr-alert--warning">
        <p className="fr-alert__title">Mock DS désactivé</p>
        <p className="fr-text--sm">
          Définir NEXT_PUBLIC_USE_DS_MOCK=true dans .env.local pour activer
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="fr-card fr-p-3w">
        <h3 className="fr-h6 fr-mb-2w">🎭 Mock Démarches Simplifiées</h3>

        <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-3w">
          <p className="fr-text--sm">
            Simulez différents statuts DS pour tester le comportement de
            synchronisation
          </p>
        </div>

        {/* Statut actuel */}
        <div className="fr-mb-3w">
          <p className="fr-text--sm fr-text--bold fr-mb-1w">
            Statut mocké actuel :
          </p>
          <div
            className="fr-badge fr-badge--sm"
            style={{ backgroundColor: currentOption?.color, color: "white" }}
          >
            {currentOption?.label}
          </div>
        </div>

        {/* Sélecteur de statut */}
        <div className="fr-select-group fr-mb-3w">
          <label className="fr-label" htmlFor="mock-status">
            Nouveau statut à simuler :
          </label>
          <select
            id="mock-status"
            className="fr-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Boutons d'action */}
        <div className="fr-btns-group fr-btns-group--sm">
          <button
            onClick={handleSetMockStatus}
            className="fr-btn fr-btn--secondary fr-btn--sm"
          >
            Appliquer le mock
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="fr-btn fr-btn--primary fr-btn--sm"
          >
            {isSyncing ? "Synchronisation..." : "Tester la sync"}
          </button>
        </div>
      </div>

      {/* Résultat de la sync */}
      {syncResult && (
        <div
          className={`fr-alert fr-alert--${syncResult.success ? "success" : "error"} fr-alert--sm`}
        >
          <p className="fr-alert__title fr-text--sm">
            {syncResult.success
              ? "✅ Synchronisation réussie"
              : "❌ Erreur de synchronisation"}
          </p>
          {syncResult.data && (
            <ul className="fr-text--xs fr-mt-1w">
              {syncResult.data.oldStatus && (
                <li>
                  Ancien statut : <strong>{syncResult.data.oldStatus}</strong>
                </li>
              )}
              {syncResult.data.newStatus && (
                <li>
                  Nouveau statut : <strong>{syncResult.data.newStatus}</strong>
                </li>
              )}
              <li>
                Mise à jour :{" "}
                <strong>{syncResult.data.updated ? "Oui" : "Non"}</strong>
              </li>
              <li>
                Rafraîchissement :{" "}
                <strong>{syncResult.data.shouldRefresh ? "Oui" : "Non"}</strong>
              </li>
            </ul>
          )}
          {syncResult.error && (
            <p className="fr-text--xs fr-mt-1w">{syncResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
