"use client";

import { useState } from "react";
import Link from "next/link";
import { rattacherAmoAction } from "@/features/backoffice/administration/diagnostics/actions/amo-a-rattacher.actions";
import type { DossierARattacher } from "@/features/backoffice/administration/diagnostics/services/amo-a-rattacher.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { DOSSIER_STEP_LABELS } from "@/features/backoffice/espace-agent/dossiers/domain";

interface FileAmoARattacherProps {
  dossiers: DossierARattacher[];
  onResolved: () => void;
}

/**
 * File des parcours sans AMO en département obligatoire. Montre l'AMO qui serait rattachée
 * avant le clic : le super-admin ne décide pas à l'aveugle.
 */
export function FileAmoARattacher({ dossiers, onResolved }: FileAmoARattacherProps) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  async function rattacher(dossier: DossierARattacher) {
    setErreur(null);
    setSucces(null);
    setEnCours(dossier.parcoursId);

    try {
      const result = await rattacherAmoAction(dossier.parcoursId);
      if (result.success) {
        setSucces(
          `${dossier.demandeur} : ${result.data.amoNom} rattachée. La demande repasse en attente de validation.`
        );
        onResolved();
      } else {
        setErreur(result.error);
      }
    } finally {
      setEnCours(null);
    }
  }

  if (dossiers.length === 0) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Aucun dossier sans AMO en département obligatoire.</p>
      </div>
    );
  }

  return (
    <>
      {erreur && (
        <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
          <p>{erreur}</p>
        </div>
      )}
      {succes && (
        <div className="fr-alert fr-alert--success fr-alert--sm fr-mb-2w">
          <p>{succes}</p>
        </div>
      )}

      <div className="fr-table fr-table--bordered">
        <table>
          <thead>
            <tr>
              <th>Demandeur</th>
              <th>Territoire</th>
              <th>Étape</th>
              <th>AMO à rattacher</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {dossiers.map((d) => (
              <tr key={d.parcoursId}>
                <td>
                  <Link className="fr-link" href={ROUTES.backoffice.espaceAgent.dossier(d.parcoursId)}>
                    {d.demandeur}
                  </Link>
                </td>
                <td>
                  {d.commune ?? "Commune inconnue"} ({d.dept})
                </td>
                <td>{DOSSIER_STEP_LABELS[d.currentStep] ?? d.currentStep}</td>
                <td>
                  {d.amoCible ? (
                    <>
                      {d.amoCible.nom}
                      <span className="fr-text--xs fr-text-mention--grey" style={{ display: "block" }}>
                        {d.amoCible.origine === "audit" ? "AMO d'origine" : "AMO du territoire"}
                      </span>
                    </>
                  ) : (
                    <span className="fr-text-mention--grey">Aucune AMO sur ce territoire</span>
                  )}
                </td>
                <td>
                  {d.gele ? (
                    <span className="fr-badge fr-badge--sm fr-badge--warning">
                      Gelé — formulaire déposé, en attente de la DDT
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="fr-btn fr-btn--sm fr-btn--secondary"
                      disabled={enCours !== null || d.amoCible === null}
                      onClick={() => rattacher(d)}>
                      {enCours === d.parcoursId ? "Rattachement…" : "Rattacher"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
