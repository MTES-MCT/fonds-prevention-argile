"use client";

import { useEffect, useState } from "react";
import {
  getMyIneligibiliteData,
  type MyIneligibiliteData,
} from "@/features/parcours/core/actions/qualification-query.actions";
import { RAISONS_INELIGIBILITE } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { formatRelativeTimeShort } from "@/shared/utils/date.utils";

/**
 * Résout le label d'une valeur stockée.
 * Gère le format "autre:précision" en affichant "Autre — précision".
 */
function getLabelForValue(list: ReadonlyArray<{ value: string; label: string }>, value: string): string {
  if (value.startsWith("autre:")) {
    const precision = value.slice("autre:".length);
    return `Autre \u2014 ${precision}`;
  }
  return list.find((item) => item.value === value)?.label ?? value;
}

export default function CalloutAmoLogementNonEligible() {
  const [data, setData] = useState<MyIneligibiliteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getMyIneligibiliteData();
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Erreur chargement données inéligibilité:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const raisonsLabels =
    data?.raisonsIneligibilite && data.raisonsIneligibilite.length > 0
      ? data.raisonsIneligibilite
          .map((r) => getLabelForValue(RAISONS_INELIGIBILITE as unknown as { value: string; label: string }[], r))
          .join(" - ")
      : null;

  const relativeTime = data ? formatRelativeTimeShort(data.createdAt) : null;

  return (
    <div id="choix-amo">
      <div className="fr-callout fr-icon-info-line fr-callout--pink-tuile">
        <p className="fr-callout__title">Vous n&apos;êtes pas éligible</p>
        <p className="fr-callout__text">
          Malheureusement, après analyse de votre dossier, il semble que votre demande ne réponde pas aux critères
          d&apos;éligibilité du fonds de prévention argile.
        </p>

        {!isLoading && data && (
          <div
            className="fr-mt-3w"
            style={{
              border: "2px solid var(--border-plain-error)",
              borderRadius: "4px",
              padding: "1.5rem",
            }}>
            {/* Agent, structure, date */}
            <div className="fr-mb-2w">
              <span className="fr-text--sm fr-mr-1v">
                Par{" "}
                {data.agentNom ? (
                  <>
                    <strong>{data.agentNom}</strong>{" "}
                    <span className="fr-text--xs fr-text-mention--grey" style={{ fontStyle: "italic" }}>
                      {data.structureNom}
                    </span>
                  </>
                ) : (
                  <strong>{data.structureNom}</strong>
                )}
              </span>
              <span className="fr-text--xs fr-ml-2v fr-text-mention--grey">&bull; {relativeTime}</span>
            </div>

            {/* Raisons d'inéligibilité */}
            {raisonsLabels && (
              <p className="fr-mb-1w">
                Raisons de l&apos;inéligibilité : <strong>{raisonsLabels}</strong>
              </p>
            )}

            {/* Note complémentaire */}
            {data.note && (
              <div className="fr-mt-2w">
                <p className="fr-mb-1w">Note complémentaire</p>
                <div
                  style={{
                    backgroundColor: "var(--background-contrast-grey)",
                    padding: "1rem",
                    borderRadius: "4px",
                  }}>
                  <p className="fr-mb-0">&ldquo;{data.note}&rdquo;</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
