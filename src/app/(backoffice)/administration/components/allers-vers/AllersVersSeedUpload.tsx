"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { importAllersVersAction } from "@/features/backoffice";

interface AllersVersSeedUploadProps {
  onImportSuccess?: () => void;
}

export function AllersVersSeedUpload({ onImportSuccess }: AllersVersSeedUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [state, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    const result = await importAllersVersAction(formData);

    if (result.success) {
      onImportSuccess?.();
    }

    return result;
  }, null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      setFile(droppedFile);

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      const fileInput = document.getElementById("file-upload-allers-vers") as HTMLInputElement;
      if (fileInput) {
        fileInput.files = dataTransfer.files;
      }
    }
  };

  return (
    <div className="fr-mb-6w fr-background-default--grey p-12">
      <div className="fr-callout fr-mb-4w">
        <h3 className="fr-callout__title">Fichier exemple</h3>
        <p className="fr-callout__text">
          Téléchargez le fichier exemple pour voir le format attendu. Vous pourrez le remplir sur votre ordinateur puis
          l'uploader ici.
        </p>
        <Link
          href="/templates/allers-vers-exemple.xlsx"
          download="allers-vers-exemple.xlsx"
          className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left">
          Télécharger le fichier exemple
        </Link>
      </div>

      <form action={formAction}>
        <div
          className={`
            fr-mb-4w
            border-2 border-dashed rounded-lg p-6 text-center transition-all
            ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-[var(--border-default-blue-france)] bg-[var(--background-contrast-blue-france)]"
            }
            ${isPending ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-blue-500 hover:bg-blue-50"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}>
          <div className="fr-upload-group">
            <label className="fr-label cursor-pointer" htmlFor="file-upload-allers-vers">
              <span className="text-lg font-semibold block mb-2">
                {file ? "Fichier sélectionné" : "Importer un fichier Excel"}
              </span>
              <span className="fr-hint-text block mb-4">
                {file ? file.name : "Glissez-déposez votre fichier ici ou cliquez pour sélectionner"}
              </span>
              <span className="fr-hint-text text-sm">Formats acceptés : .xlsx, .xls</span>
            </label>
            <input
              className="sr-only"
              type="file"
              id="file-upload-allers-vers"
              name="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isPending}
              required
            />
          </div>
        </div>

        <button type="submit" className="fr-btn fr-btn--icon-left" disabled={!file || isPending}>
          {isPending ? "Import en cours..." : "Importer les données"}
        </button>
      </form>

      {state && (
        <div className={`fr-alert ${state.success ? "fr-alert--success" : "fr-alert--error"} fr-mt-4w`}>
          <h3 className="fr-alert__title">{state.success ? "Import réussi" : "Erreur lors de l'import"}</h3>

          {state.success && state.data && (
            <div className="fr-mt-2w">
              <p className="fr-text--bold">Résultat :</p>
              <ul>
                <li>
                  {state.data.created} structure{state.data.created > 1 ? "s" : ""} créée
                  {state.data.created > 1 ? "s" : ""}
                </li>
              </ul>
            </div>
          )}

          {!state.success && state.error && <p>{state.error}</p>}

          {state && (
            <div className={`fr-alert ${state.success ? "fr-alert--success" : "fr-alert--error"} fr-mt-4w`}>
              <h3 className="fr-alert__title">{state.success ? "Import réussi" : "Erreur lors de l'import"}</h3>

              {state.success && (
                <div className="fr-mt-2w">
                  <p className="fr-text--bold">Résultat :</p>
                  <ul>
                    <li>
                      {state.data.created} structure{state.data.created > 1 ? "s" : ""} créée
                      {state.data.created > 1 ? "s" : ""}
                    </li>
                  </ul>

                  {state.data.errors && state.data.errors.length > 0 && (
                    <div className="fr-mt-2w">
                      <p className="fr-text--bold">Erreurs rencontrées :</p>
                      <ul className="fr-text--sm">
                        {state.data.errors.slice(0, 10).map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                        {state.data.errors.length > 10 && (
                          <li>... et {state.data.errors.length - 10} autres erreurs</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!state.success && <p>{state.error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
