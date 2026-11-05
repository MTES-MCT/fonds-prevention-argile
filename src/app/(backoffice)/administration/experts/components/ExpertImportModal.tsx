"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BilanImportExperts } from "@/features/backoffice";
import ModaleStructure from "../../structures/components/ModaleStructure";

interface ExpertImportModalProps {
  modalId: string;
  ouverture: number;
  onImporter: (fichier: File) => Promise<BilanImportExperts | null>;
  erreur?: string | null;
  isLoading?: boolean;
}

// La modale reste ouverte après l'import : le bilan s'y lit, lignes refusées comprises.
export default function ExpertImportModal({
  modalId,
  ouverture,
  onImporter,
  erreur = null,
  isLoading = false,
}: ExpertImportModalProps) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [bilan, setBilan] = useState<BilanImportExperts | null>(null);

  useEffect(() => {
    setFichier(null);
    setBilan(null);
  }, [ouverture]);

  const handleConfirm = async () => {
    if (fichier) setBilan(await onImporter(fichier));
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre="Importer des experts"
      erreur={erreur}
      libelleConfirmation="Importer"
      libelleEnCours="Import..."
      confirmationPossible={!!fichier}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      <p className="text-sm">
        Une ligne par expert, ou par département quand le contact change d&apos;un département à l&apos;autre : les
        lignes d&apos;un même SIRET sont réunies. Les départements du fichier remplacent ceux de l&apos;expert ; une
        date ou un contact interne absent du fichier ne retire pas celui déjà saisi.{" "}
        <Link href="/templates/experts-exemple.xlsx" download="experts-exemple.xlsx" className="fr-link">
          Télécharger le modèle
        </Link>
      </p>

      <div className="fr-upload-group">
        <label className="fr-label" htmlFor={`${modalId}-fichier`}>
          Fichier Excel
          <span className="fr-hint-text">Format .xlsx, 2 Mo au plus</span>
        </label>
        <input
          className="fr-upload"
          type="file"
          id={`${modalId}-fichier`}
          accept=".xlsx"
          disabled={isLoading}
          onChange={(e) => {
            setFichier(e.target.files?.[0] ?? null);
            setBilan(null);
          }}
        />
      </div>

      {bilan && (
        <div
          className={`fr-alert fr-alert--sm fr-mt-2w ${bilan.lignesRefusees.length > 0 ? "fr-alert--warning" : "fr-alert--success"}`}
          role="status">
          <p>
            {bilan.crees} expert{bilan.crees > 1 ? "s" : ""} créé{bilan.crees > 1 ? "s" : ""}, {bilan.misAJour} mis à
            jour.
            {bilan.lignesRefusees.length > 0 &&
              ` ${bilan.lignesRefusees.length} ligne${bilan.lignesRefusees.length > 1 ? "s" : ""} refusée${bilan.lignesRefusees.length > 1 ? "s" : ""} :`}
          </p>
          {bilan.lignesRefusees.length > 0 && (
            <ul className="text-sm">
              {bilan.lignesRefusees.map((refus) => (
                <li key={`${refus.ligne}-${refus.motif}`}>
                  Ligne {refus.ligne} : {refus.motif}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ModaleStructure>
  );
}
