"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { inspecterDossierDnAction } from "@/features/backoffice/administration/diagnostics/actions/reconciliation.actions";
import { MOTIF_LABELS, type InspectionDossier } from "@/features/parcours/dossiers-ds/domain/types/inspection.types";

/**
 * Ce que DN sait d'un dossier orphelin, et les demandeurs qui lui ressemblent.
 * Aide à l'identification : rien n'est rattaché ici, la décision reste à l'agent.
 */
export function InspectionDossierDn({ dsNumber }: { dsNumber: string }) {
  const [inspection, setInspection] = useState<InspectionDossier | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(true);

  useEffect(() => {
    let annule = false;

    inspecterDossierDnAction(dsNumber)
      .then((result) => {
        if (annule) return;
        if (result.success) setInspection(result.data);
        else setErreur(result.error);
      })
      .finally(() => {
        if (!annule) setEnCours(false);
      });

    return () => {
      annule = true;
    };
  }, [dsNumber]);

  if (enCours) return <p className="fr-text--sm fr-mb-0">Interrogation de Démarches Numériques…</p>;
  if (erreur) return <p className="fr-text--sm fr-mb-0">{erreur}</p>;
  if (!inspection) return null;

  const { dn, candidats } = inspection;

  return (
    <div className="fr-mt-2w fr-p-2w" style={{ background: "var(--background-alt-grey)" }}>
      <p className="fr-text--sm fr-mb-1w">
        <strong>Déclaré côté Démarches Numériques</strong>
      </p>
      <ul className="fr-text--xs">
        {(dn.nomDeclare || dn.prenomDeclare) && (
          <li>
            Identité : {dn.prenomDeclare} {dn.nomDeclare}
          </li>
        )}
        {dn.emailUsager && <li>Compte : {dn.emailUsager}</li>}
        {dn.deposeParUnTiers && <li>Déposé par un tiers{dn.mandataire ? ` (${dn.mandataire})` : ""}</li>}
        {dn.champs.map((c) => (
          <li key={c.label}>
            {c.label} : {c.valeur}
          </li>
        ))}
      </ul>

      <p className="fr-text--sm fr-mb-1w">
        <strong>Demandeurs qui correspondent</strong>
      </p>

      {candidats.length === 0 ? (
        <p className="fr-text--xs fr-mb-0">
          Aucun demandeur ne correspond, ni par adresse, ni par téléphone, ni par e-mail, ni par nom. Ce dossier a
          probablement été déposé hors du dispositif : écartez-le.
        </p>
      ) : (
        <ul className="fr-text--xs">
          {candidats.map((c) => (
            <li key={c.parcoursId}>
              <Link href={`/espace-agent/dossiers/${c.parcoursId}`}>
                {[c.prenom, c.nom].filter(Boolean).join(" ") || c.email || c.parcoursId.slice(0, 8)}
              </Link>{" "}
              — {c.motifs.map((m) => MOTIF_LABELS[m]).join(", ") || "correspondance partielle"}
              {c.adresse && <span> · {c.adresse}</span>}
            </li>
          ))}
        </ul>
      )}

      <p className="fr-text--xs fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
        Ces correspondances sont des indices, pas des preuves : une adresse e-mail peut être celle de l&apos;AMO, un nom
        peut être porté par deux personnes. Vérifiez avant de rattacher.
      </p>
    </div>
  );
}
