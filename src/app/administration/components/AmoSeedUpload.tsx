"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { Amo } from "@/features/parcours/amo";
import {
  getAllAmos,
  importAmoFromExcel,
} from "@/features/parcours/amo/actions";

interface AmoWithCommunes extends Amo {
  communes?: { codeInsee: string }[];
}

export function AmoSeedUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [amos, setAmos] = useState<AmoWithCommunes[]>([]);
  const [isLoadingAmos, setIsLoadingAmos] = useState(true);

  const [state, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      return await importAmoFromExcel(formData, clearExisting);
    },
    null
  );

  // Charger les AMO au montage du composant et après un import réussi
  useEffect(() => {
    loadAmos();
  }, []);

  useEffect(() => {
    if (state?.success) {
      loadAmos();
    }
  }, [state]);

  const loadAmos = async () => {
    setIsLoadingAmos(true);
    try {
      const result = await getAllAmos();
      if (result.success && result.data) {
        setAmos(result.data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des AMO:", error);
    } finally {
      setIsLoadingAmos(false);
    }
  };

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
    if (
      droppedFile &&
      (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))
    ) {
      setFile(droppedFile);

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.files = dataTransfer.files;
      }
    }
  };

  return (
    <div className="fr-container fr-py-6w">
      <h2 className="fr-h3">Import des entreprises AMO</h2>

      {/* Télécharger le template */}
      <div className="fr-callout fr-mb-4w">
        <h3 className="fr-callout__title">Fichier exemple</h3>
        <p className="fr-callout__text">
          Téléchargez le fichier exemple pour voir le format attendu. Vous
          pourrez le remplir sur votre ordinateur puis l'uploader ici.
        </p>
        <Link
          href="/templates/amo-exemple.xlsx"
          download="amo-exemple.xlsx"
          className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left"
        >
          Télécharger le fichier exemple
        </Link>
      </div>

      {/* Formulaire d'upload */}
      <form action={formAction}>
        {/* Zone de drag & drop stylisée */}
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
          onDrop={handleDrop}
        >
          <div className="fr-upload-group">
            <label className="fr-label cursor-pointer" htmlFor="file-upload">
              <span className="text-lg font-semibold block mb-2">
                {file ? "Fichier sélectionné" : "Importer un fichier Excel"}
              </span>
              <span className="fr-hint-text block mb-4">
                {file
                  ? file.name
                  : "Glissez-déposez votre fichier ici ou cliquez pour sélectionner"}
              </span>
              <span className="fr-hint-text text-sm">
                Formats acceptés : .xlsx, .xls
              </span>
            </label>
            <input
              className="sr-only"
              type="file"
              id="file-upload"
              name="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isPending}
              required
            />
          </div>
        </div>

        {/* Option de nettoyage */}
        <div className="fr-checkbox-group fr-my-4w">
          <input
            type="checkbox"
            id="clear-existing"
            checked={clearExisting}
            onChange={(e) => setClearExisting(e.target.checked)}
            disabled={isPending}
          />
          <label className="fr-label" htmlFor="clear-existing">
            Supprimer toutes les données AMO existantes avant l'import
            <span className="fr-hint-text">
              Attention : cette action est irréversible
            </span>
          </label>
        </div>

        {/* Bouton de soumission */}
        <button
          type="submit"
          className="fr-btn fr-btn--icon-left"
          disabled={!file || isPending}
        >
          {isPending ? "Import en cours..." : "Importer les données"}
        </button>
      </form>

      {/* Résultat */}
      {state && (
        <div
          className={`fr-alert ${state.success ? "fr-alert--success" : "fr-alert--error"} fr-mt-4w`}
        >
          <h3 className="fr-alert__title">
            {state.success ? "Import réussi" : "Erreur lors de l'import"}
          </h3>
          <p>{state.message}</p>

          {state.stats && (
            <div className="fr-mt-2w">
              <p className="fr-text--bold">Statistiques :</p>
              <ul>
                <li>{state.stats.entreprisesCreated} entreprises créées</li>
                <li>{state.stats.communesCreated} communes associées</li>
              </ul>
            </div>
          )}

          {state.errors && state.errors.length > 0 && (
            <div className="fr-mt-2w">
              <p className="fr-text--bold">Erreurs rencontrées :</p>
              <ul className="fr-text--sm">
                {state.errors.slice(0, 10).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {state.errors.length > 10 && (
                  <li>... et {state.errors.length - 10} autres erreurs</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Table des AMO */}
      <div className="fr-mt-6w">
        <h3 className="fr-h4 fr-mb-2w">Liste des AMO enregistrées</h3>

        {isLoadingAmos ? (
          <div className="fr-py-4w text-center">
            <p>Chargement des AMO...</p>
          </div>
        ) : amos.length === 0 ? (
          <div className="fr-callout fr-callout--info">
            <p className="fr-callout__text">
              Aucune AMO enregistrée pour le moment. Importez un fichier Excel
              pour commencer.
            </p>
          </div>
        ) : (
          <div className="fr-table fr-table--lg fr-table--bordered fr-table--multiline">
            <div className="fr-table__wrapper">
              <div className="fr-table__container">
                <div className="fr-table__content">
                  <table>
                    <caption className="sr-only">
                      Liste des entreprises AMO
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Nom</th>
                        <th scope="col">SIRET</th>
                        <th scope="col">Départements</th>
                        <th scope="col">Emails</th>
                        <th scope="col">Téléphone</th>
                        <th scope="col">Adresse</th>
                        <th scope="col">Codes INSEE spécifiques</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amos.map((amo) => (
                        <tr key={amo.id}>
                          <td>{amo.nom}</td>
                          <td className="fr-text--sm">{amo.siret || "-"}</td>
                          <td className="fr-text--sm">
                            {amo.departements || "-"}
                          </td>
                          <td className="fr-text--sm">
                            {amo.emails
                              ? amo.emails
                                  .split(";")
                                  .map((email, idx) => (
                                    <div key={idx}>{email}</div>
                                  ))
                              : "-"}
                          </td>
                          <td>{amo.telephone || "-"}</td>
                          <td className="fr-text--sm">{amo.adresse || "-"}</td>
                          <td className="fr-text--sm">
                            {amo.communes && amo.communes.length > 0
                              ? amo.communes.map((c) => c.codeInsee).join(", ")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {amos.length > 0 && (
          <p className="fr-text--sm fr-mt-2w text-gray-600">
            Total : {amos.length} AMO enregistrée{amos.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
