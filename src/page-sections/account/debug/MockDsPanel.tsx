import { useState } from "react";
import { syncUserDossierStatus } from "@/lib/actions/demarches-simplifies/sync.actions";
import { DSStatus, Step } from "@/lib/parcours/parcours.types";

// Types pour les résultats de synchronisation
interface SyncData {
  updated: boolean;
  oldStatus?: string;
  newStatus?: string;
  shouldRefresh: boolean;
  isBrouillon?: boolean;
}

interface SyncResult {
  success: boolean;
  data?: SyncData;
  error?: string;
}

// Types pour les options de statut
interface StatusOption {
  value: DSStatus;
  label: string;
  badgeType: "new" | "info" | "success" | "error" | "warning";
  description: string;
}

const statusOptions: StatusOption[] = [
  {
    value: DSStatus.EN_CONSTRUCTION,
    label: "En construction",
    badgeType: "new",
    description: "Le dossier est en cours de remplissage",
  },
  {
    value: DSStatus.EN_INSTRUCTION,
    label: "En instruction",
    badgeType: "info",
    description: "Le dossier est en cours d'instruction par l'administration",
  },
  {
    value: DSStatus.ACCEPTE,
    label: "Accepté",
    badgeType: "success",
    description: "Le dossier a été accepté",
  },
  {
    value: DSStatus.REFUSE,
    label: "Refusé",
    badgeType: "error",
    description: "Le dossier a été refusé",
  },
  {
    value: DSStatus.CLASSE_SANS_SUITE,
    label: "Classé sans suite",
    badgeType: "warning",
    description: "Le dossier a été classé sans suite",
  },
];

export default function MockDSPanel() {
  const [selectedStatus, setSelectedStatus] = useState<DSStatus>(
    DSStatus.EN_CONSTRUCTION
  );
  const [selectedStep, setSelectedStep] = useState<Step>(Step.ELIGIBILITE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplyingMock, setIsApplyingMock] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [mockApplied, setMockApplied] = useState(false);

  const mockEnabled = process.env.NEXT_PUBLIC_USE_DS_MOCK === "true";
  const currentOption = statusOptions.find(
    (opt) => opt.value === selectedStatus
  );

  const handleSetMockStatus = async () => {
    setIsApplyingMock(true);
    setMockApplied(false);
    setSyncResult(null);

    try {
      const response = await fetch("/api/test/mock-ds-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          step: selectedStep,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      setMockApplied(true);
      console.log(
        `✅ Mock DS: Statut défini sur "${selectedStatus}" pour l'étape ${selectedStep}`
      );
    } catch (error) {
      console.error("Erreur lors de l'application du mock:", error);
      setSyncResult({
        success: false,
        error: "Impossible d'appliquer le mock. Vérifiez la configuration.",
      });
    } finally {
      setIsApplyingMock(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setMockApplied(false);

    try {
      // Sync avec l'étape sélectionnée
      const result = await syncUserDossierStatus(selectedStep);
      setSyncResult(result);

      // Si la sync a réussi et qu'il faut rafraîchir
      if (result.success && result.data?.shouldRefresh) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!mockEnabled) {
    return (
      <div className="fr-card">
        <div className="fr-card__body">
          <div className="fr-card__content">
            <h3 className="fr-h6 fr-mb-2w">
              <span
                className="fr-icon-test-tube-line fr-mr-1w"
                aria-hidden="true"
              ></span>
              Mock Démarches Simplifiées
            </h3>

            <div className="fr-alert fr-alert--warning fr-alert--sm">
              <h4 className="fr-alert__title">Mock DS désactivé</h4>
              <p>
                Pour activer le mode mock, définissez{" "}
                <code>NEXT_PUBLIC_USE_DS_MOCK=true</code> dans votre fichier{" "}
                <code>.env.local</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-h6 fr-mb-3w">
            <span
              className="fr-icon-test-tube-line fr-mr-1w"
              aria-hidden="true"
            ></span>
            Simulation Démarches Simplifiées
          </h3>

          <div className="fr-notice fr-notice--info fr-mb-3w">
            <div className="fr-container--fluid">
              <div className="fr-notice__body">
                <p className="fr-text--sm">
                  Simulez différents statuts pour tester le comportement de
                  synchronisation avec Démarches Simplifiées.
                </p>
              </div>
            </div>
          </div>

          {/* Sélection de l'étape */}
          <div className="fr-select-group fr-mb-2w">
            <label className="fr-label" htmlFor="mock-step-select">
              Étape du parcours concernée
              <span className="fr-hint-text">
                Sélectionnez l'étape pour laquelle simuler le statut
              </span>
            </label>
            <select
              className="fr-select"
              id="mock-step-select"
              value={selectedStep}
              onChange={(e) => {
                setSelectedStep(e.target.value as Step);
                setMockApplied(false);
                setSyncResult(null);
              }}
            >
              <option value={Step.ELIGIBILITE}>Éligibilité</option>
              <option value={Step.DIAGNOSTIC}>Diagnostic</option>
              <option value={Step.DEVIS}>Devis</option>
              <option value={Step.FACTURES}>Factures</option>
            </select>
          </div>

          {/* Sélection du statut */}
          <div className="fr-select-group fr-mb-2w">
            <label className="fr-label" htmlFor="mock-status-select">
              Statut DS à simuler
              <span className="fr-hint-text">
                Ce statut sera retourné lors de la prochaine synchronisation
              </span>
            </label>
            <select
              className="fr-select"
              id="mock-status-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as DSStatus);
                setMockApplied(false);
                setSyncResult(null);
              }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Affichage du statut sélectionné */}
          {currentOption && (
            <div className="fr-callout fr-mb-3w">
              <h4 className="fr-callout__title fr-text--sm">
                Configuration du mock :
              </h4>
              <div className="fr-mb-1w">
                <strong className="fr-text--xs">Étape :</strong>{" "}
                <span className="fr-badge fr-badge--sm fr-badge--blue-ecume">
                  {selectedStep}
                </span>
              </div>
              <div className="fr-mb-1w">
                <strong className="fr-text--xs">Statut :</strong>{" "}
                <span
                  className={`fr-badge fr-badge--sm fr-badge--${currentOption.badgeType}`}
                >
                  {currentOption.label}
                </span>
              </div>
              <p className="fr-text--xs fr-mb-0">{currentOption.description}</p>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="fr-btns-group fr-btns-group--inline">
            <button
              onClick={handleSetMockStatus}
              disabled={isApplyingMock}
              className="fr-btn fr-btn--secondary fr-btn--icon-left"
            >
              <span className="fr-icon-refresh-line" aria-hidden="true"></span>
              {isApplyingMock ? "Application..." : "Appliquer le mock"}
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing || !mockApplied}
              className="fr-btn fr-btn--icon-left"
              title={!mockApplied ? "Appliquez d'abord un mock" : ""}
            >
              <span className="fr-icon-download-line" aria-hidden="true"></span>
              {isSyncing ? "Synchronisation..." : "Tester la synchronisation"}
            </button>
          </div>

          {/* Message de confirmation du mock */}
          {mockApplied && !syncResult && (
            <div className="fr-alert fr-alert--success fr-alert--sm fr-mt-3w">
              <p className="fr-alert__title">Mock appliqué avec succès</p>
              <p>
                Le statut "{currentOption?.label}" sera retourné pour l'étape{" "}
                {selectedStep}
                lors de la prochaine synchronisation.
              </p>
            </div>
          )}

          {/* Résultat de la synchronisation */}
          {syncResult && (
            <div
              className={`fr-alert fr-alert--${syncResult.success ? "success" : "error"} fr-mt-3w`}
            >
              <h4 className="fr-alert__title">
                {syncResult.success
                  ? "Synchronisation réussie"
                  : "Erreur de synchronisation"}
              </h4>

              {syncResult.data && (
                <div className="fr-mt-2w">
                  <dl className="fr-text--sm">
                    {syncResult.data.oldStatus && (
                      <>
                        <dt className="fr-text--bold fr-text--xs">
                          Ancien statut :
                        </dt>
                        <dd className="fr-mb-1w">
                          <span className="fr-badge fr-badge--sm">
                            {syncResult.data.oldStatus}
                          </span>
                        </dd>
                      </>
                    )}
                    {syncResult.data.newStatus && (
                      <>
                        <dt className="fr-text--bold fr-text--xs">
                          Nouveau statut :
                        </dt>
                        <dd className="fr-mb-1w">
                          <span className="fr-badge fr-badge--sm fr-badge--success">
                            {syncResult.data.newStatus}
                          </span>
                        </dd>
                      </>
                    )}
                    <dt className="fr-text--bold fr-text--xs">
                      Mise à jour effectuée :
                    </dt>
                    <dd className="fr-mb-1w">
                      {syncResult.data.updated
                        ? "Oui"
                        : "Non (statut identique)"}
                    </dd>
                    {syncResult.data.shouldRefresh && (
                      <>
                        <dt className="fr-text--bold fr-text--xs">
                          Rafraîchissement :
                        </dt>
                        <dd>
                          <span
                            className="fr-icon-refresh-line fr-icon--sm"
                            aria-hidden="true"
                          ></span>
                          La page va se recharger...
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {syncResult.error && (
                <p className="fr-text--sm fr-mt-2w">{syncResult.error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
