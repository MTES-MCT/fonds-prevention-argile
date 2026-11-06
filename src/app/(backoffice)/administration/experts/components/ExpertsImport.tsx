"use client";

import { useActionState, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { importerExpertsAction } from "@/features/backoffice";

interface ExpertsImportProps {
  onImportSuccess?: () => void;
}

const ID_FICHIER = "file-upload-experts";

// Même écran que l'import des AMO et des Aller-vers, sans purge : un départ se traite par la désactivation.
export function ExpertsImport({ onImportSuccess }: ExpertsImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [state, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    const result = await importerExpertsAction(formData);
    if (result.success) onImportSuccess?.();
    return result;
  }, null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith(".xlsx")) {
      setFile(droppedFile);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      const fileInput = document.getElementById(ID_FICHIER) as HTMLInputElement | null;
      if (fileInput) fileInput.files = dataTransfer.files;
    }
  };

  return (
    <div className="fr-mb-6w fr-background-default--grey p-12">
      <div className="fr-tile fr-tile--download fr-enlarge-link fr-mb-6w">
        <div className="fr-tile__body">
          <div className="fr-tile__content">
            <h3 className="fr-tile__title">
              <Link href="/templates/experts-exemple.xlsx" download="experts-exemple.xlsx">
                Télécharger le fichier exemple
              </Link>
            </h3>
            <p className="fr-tile__detail">
              Téléchargez le fichier exemple pour voir le format attendu. Le référencement transmis par la DHUP est
              aussi accepté tel quel.
            </p>
          </div>
        </div>
        <div className="fr-tile__header">
          <div className="fr-tile__pictogram">
            <svg aria-hidden="true" className="fr-artwork" viewBox="0 0 80 80" width="80px" height="80px">
              <use className="fr-artwork-decorative" href="/illustrations/document-download.svg"></use>
              <use className="fr-artwork-minor" href="/illustrations/document-download.svg"></use>
              <use className="fr-artwork-major" href="/illustrations/document-download.svg"></use>
            </svg>
          </div>
        </div>
      </div>

      <p className="fr-text--sm">
        Un expert déjà présent (même SIRET) est mis à jour au lieu d&apos;être dupliqué : ses départements sont
        remplacés par ceux du fichier. Une ligne par expert, ou par département quand le contact change d&apos;un
        département à l&apos;autre. Dans les colonnes à plusieurs valeurs, séparez-les par des virgules ou des
        points-virgules.
      </p>

      <form action={formAction}>
        <div
          className={`
            fr-mb-4w
            border-2 border-dashed rounded-lg p-6 text-center transition-all
            ${
              isDragOver
                ? "border-(--border-active-blue-france) bg-(--background-contrast-blue-france-hover)"
                : "border-(--border-default-blue-france) bg-(--background-contrast-blue-france)"
            }
            ${isPending ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-(--border-active-blue-france)"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}>
          <div className="fr-upload-group">
            <label className="fr-label cursor-pointer" htmlFor={ID_FICHIER}>
              <span className="text-lg font-semibold block mb-2">
                {file ? "Fichier sélectionné" : "Importer un fichier Excel"}
              </span>
              <span className="fr-hint-text block mb-4">
                {file ? file.name : "Glissez-déposez votre fichier ici ou cliquez pour sélectionner"}
              </span>
              <span className="fr-hint-text text-sm">Format accepté : .xlsx, 2 Mo au plus</span>
            </label>
            <input
              className="sr-only"
              type="file"
              id={ID_FICHIER}
              name="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={isPending}
              required
            />
          </div>
        </div>

        <div className="fr-notice fr-notice--info fr-mb-4w">
          <div className="fr-container">
            <div className="fr-notice__body">
              <p className="fr-notice__title">
                L&apos;import ne supprime aucun expert : un expert absent du fichier reste tel quel. Pour un départ,
                utilisez « Désactiver » dans la liste.
              </p>
            </div>
          </div>
        </div>

        <button type="submit" className="fr-btn fr-btn--icon-left" disabled={!file || isPending}>
          {isPending ? "Import en cours..." : "Importer les données"}
        </button>
      </form>

      {state && (
        <div className={`fr-alert ${state.success ? "fr-alert--success" : "fr-alert--error"} fr-mt-4w`}>
          <h3 className="fr-alert__title">{state.success ? "Import réussi" : "Erreur lors de l'import"}</h3>

          {state.success && (
            <div className="fr-mt-2w">
              <p className="fr-text--bold">Résultat :</p>
              <ul>
                <li>
                  {state.data.crees} expert{state.data.crees > 1 ? "s" : ""} créé{state.data.crees > 1 ? "s" : ""}
                </li>
                <li>
                  {state.data.misAJour} expert{state.data.misAJour > 1 ? "s" : ""} mis à jour
                </li>
              </ul>

              {/* Toutes les lignes, sans troncature : chacune est à corriger dans le fichier. */}
              {state.data.lignesRefusees.length > 0 && (
                <div className="fr-mt-2w">
                  <p className="fr-text--bold">Lignes refusées :</p>
                  <ul className="fr-text--sm">
                    {state.data.lignesRefusees.map((refus) => (
                      <li key={`${refus.ligne}-${refus.motif}`}>
                        Ligne {refus.ligne} : {refus.motif}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!state.success && <p>{state.error}</p>}
        </div>
      )}
    </div>
  );
}
