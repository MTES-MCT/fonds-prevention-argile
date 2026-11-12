"use client";

import { useActionState, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { importerStructuresAction } from "@/features/backoffice";

const NOMBRE_AFFICHE = 10;

export type RoleImport = "amo" | "allersVers" | "expert";

const MODELES: Record<RoleImport, { fichier: string; aide: string[] }> = {
  amo: { fichier: "amo-exemple.xlsx", aide: ["Le SIRET est obligatoire.", "Une ligne par AMO."] },
  allersVers: {
    fichier: "allers-vers-exemple.xlsx",
    aide: [
      "Le SIRET est obligatoire.",
      "Un Aller-vers déjà connu sans SIRET est retrouvé par son nom et un département commun, puis reçoit ce SIRET.",
    ],
  },
  expert: {
    fichier: "experts-exemple.xlsx",
    aide: [
      "Une ligne par contact de réservation.",
      "Le fichier de la DHUP est accepté tel quel.",
      "Une société aussi AMO aura une seconde structure, de type expert.",
    ],
  },
};

const AIDE_COMMUNE = [
  "Rien n'est supprimé.",
  "Ajouter AMO ou Aller-vers à une structure qui a des agents est réservé au super-administrateur.",
];

interface ImportStructuresProps {
  role: RoleImport;
  onImportSuccess?: () => void;
}

const compter = (nombre: number, singulier: string, pluriel: string) => `${nombre} ${nombre > 1 ? pluriel : singulier}`;

function ListeTronquee({ titre, elements }: { titre: string; elements: string[] }) {
  if (elements.length === 0) return null;
  const restants = elements.length - NOMBRE_AFFICHE;
  return (
    <div className="fr-mt-2w">
      <p className="fr-text--bold fr-mb-1v">{titre}</p>
      <ul className="fr-text--sm">
        {elements.slice(0, NOMBRE_AFFICHE).map((element, index) => (
          <li key={index}>{element}</li>
        ))}
        {restants > 0 && <li>et {compter(restants, "autre", "autres")}</li>}
      </ul>
    </div>
  );
}

// Un fichier par rôle : le SIRET de chaque ligne désigne la structure.
export default function ImportStructures({ role, onImportSuccess }: ImportStructuresProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [remplacer, setRemplacer] = useState(false);
  const idFichier = `file-upload-${role}`;
  const modele = MODELES[role];

  const [state, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    const result = await importerStructuresAction(formData);
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
      const fileInput = document.getElementById(idFichier) as HTMLInputElement | null;
      if (fileInput) fileInput.files = dataTransfer.files;
    }
  };

  return (
    <div className="fr-p-4w bg-(--background-default-grey)">
      <div className="fr-tile fr-tile--download fr-enlarge-link fr-mb-4w">
        <div className="fr-tile__body">
          <div className="fr-tile__content">
            <h2 className="fr-tile__title">
              <Link href={`/templates/${modele.fichier}`} download={modele.fichier}>
                Télécharger le fichier exemple
              </Link>
            </h2>
            <p className="fr-tile__detail">Le modèle à remplir, avec sa feuille « Mode d&apos;emploi ».</p>
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
            <label className="fr-label cursor-pointer" htmlFor={idFichier}>
              <span className="text-lg font-semibold block mb-2">
                {file ? "Fichier sélectionné" : "Importer un fichier Excel"}
              </span>
              <span className="fr-hint-text block mb-4">
                {file ? file.name : "Glissez-déposez votre fichier ici ou cliquez pour sélectionner"}
              </span>
              <span className="fr-hint-text text-sm">Format accepté : .xlsx</span>
            </label>
            <input
              className="sr-only"
              type="file"
              id={idFichier}
              name="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={isPending}
              required
            />
          </div>
        </div>

        <div className="fr-checkbox-group fr-mb-4w">
          <input
            type="checkbox"
            id={`remplacer-coordonnees-${role}`}
            checked={remplacer}
            onChange={(e) => setRemplacer(e.target.checked)}
            disabled={isPending}
          />
          <label className="fr-label" htmlFor={`remplacer-coordonnees-${role}`}>
            Remplacer les coordonnées des structures existantes par celles du fichier
            <span className="fr-hint-text">
              Sinon, l&apos;import ne fait que compléter les champs vides. Le SIRET n&apos;est jamais remplacé.
            </span>
          </label>
        </div>
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="remplacer" value={remplacer ? "oui" : "non"} />

        <button type="submit" className="fr-btn" disabled={!file || isPending}>
          {isPending ? "Import en cours..." : "Importer le fichier"}
        </button>
      </form>

      <ul className="fr-text--sm text-(--text-mention-grey) fr-mt-2w fr-mb-0">
        {[...modele.aide, ...AIDE_COMMUNE].map((ligne) => (
          <li key={ligne}>{ligne}</li>
        ))}
      </ul>

      {state && !state.success && (
        <div className="fr-alert fr-alert--error fr-mt-4w">
          <h3 className="fr-alert__title">Erreur lors de l&apos;import</h3>
          <p>{state.error}</p>
        </div>
      )}

      {state?.success && (
        <div className="fr-alert fr-alert--success fr-mt-4w">
          <h3 className="fr-alert__title">Import terminé</h3>
          <ul>
            <li>{compter(state.data.structuresCreees, "structure créée", "structures créées")}</li>
            <li>{compter(state.data.structuresMisesAJour, "structure mise à jour", "structures mises à jour")}</li>
            <li>{compter(state.data.habilitationsAjoutees, "habilitation ajoutée", "habilitations ajoutées")}</li>
            <li>
              {compter(state.data.habilitationsMisesAJour, "habilitation mise à jour", "habilitations mises à jour")}
            </li>
          </ul>
          <ListeTronquee
            titre="Lignes refusées"
            elements={state.data.lignesRefusees.map((refus) => `Ligne ${refus.ligne} : ${refus.motif}`)}
          />
          <ListeTronquee titre="Points à vérifier" elements={state.data.avertissements} />
        </div>
      )}
    </div>
  );
}
