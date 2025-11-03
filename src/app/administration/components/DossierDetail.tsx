"use client";

import { getDossierByNumber } from "@/features/parcours/dossiers-ds/actions";
import {
  Champ,
  Dossier,
} from "@/features/parcours/dossiers-ds/adapters/graphql";
import {
  DS_FIELDS_ELIGIBILITE,
  DSSection,
} from "@/features/parcours/dossiers-ds/domain";
import {
  getFieldLabelsMap,
  getSectionsWithFields,
} from "@/features/parcours/dossiers-ds/utils";
import { useEffect, useState } from "react";

interface DossierDetailProps {
  dossierNumber: number;
  onClose: () => void;
}

function formatFieldValue(champ: Champ): string {
  // Pour les booléens
  if (champ.stringValue === "true" || champ.stringValue === "false") {
    return champ.stringValue === "true" ? "Oui" : "Non";
  }

  // Pour les pièces jointes
  if (champ.file) {
    return `📎 ${champ.file.filename}`;
  }

  return champ.stringValue || "—";
}

export default function DossierDetail({
  dossierNumber,
  onClose,
}: DossierDetailProps) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    DSSection.MAISON
  );

  useEffect(() => {
    const fetchDossier = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getDossierByNumber(dossierNumber);
        if (result.success && result.data) {
          setDossier(result.data);
        } else if (!result.success) {
          setError(result.error || "Erreur lors de la récupération du dossier");
        } else {
          setError("Dossier non trouvé");
        }
      } catch (err) {
        setError("Erreur inattendue " + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchDossier();
  }, [dossierNumber]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Récupérer les labels et sections depuis les constantes
  const fieldLabels = getFieldLabelsMap();
  const sectionsWithFields = getSectionsWithFields();

  return (
    <div className="fr-callout fr-callout--brown-caramel fr-mb-4w">
      <button
        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-float-right"
        onClick={onClose}
        aria-label="Fermer le détail"
      >
        ✕
      </button>

      <h3 className="fr-callout__title">Détail du dossier n°{dossierNumber}</h3>

      {loading && (
        <div className="fr-py-2w">
          <p>Chargement du dossier...</p>
        </div>
      )}

      {error && (
        <div className="fr-alert fr-alert--error fr-alert--sm">
          <p>{error}</p>
        </div>
      )}

      {dossier && (
        <div className="fr-callout__text">
          {/* Informations principales */}
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-3w">
            <div className="fr-col-12 fr-col-md-4">
              <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                Usager
              </p>
              <p className="fr-text--sm fr-text--bold">
                {dossier.usager?.email || "Non renseigné"}
              </p>
            </div>
            <div className="fr-col-12 fr-col-md-4">
              <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">État</p>
              <span className="fr-badge fr-badge--info fr-badge--sm">
                {dossier.state}
              </span>
            </div>
            <div className="fr-col-12 fr-col-md-4">
              <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                Date de dépôt
              </p>
              <p className="fr-text--sm">
                {dossier.datePassageEnConstruction
                  ? new Date(
                      dossier.datePassageEnConstruction
                    ).toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </div>
          </div>

          {/* Réponses groupées par section */}
          <h4 className="fr-h6 fr-mb-2w">Réponses du formulaire</h4>

          {Object.entries(sectionsWithFields).map(([sectionName, fieldIds]) => {
            const sectionChamps =
              dossier.champs?.filter((champ) => fieldIds.includes(champ.id)) ||
              [];

            if (sectionChamps.length === 0) return null;

            // Déterminer si cette section contient des champs mappables
            const hasMappableFields = fieldIds.some(
              (fieldId) => DS_FIELDS_ELIGIBILITE[fieldId]?.rgaPath
            );

            return (
              <div key={sectionName} className="fr-accordion fr-mb-1w">
                <h3 className="fr-accordion__title">
                  <button
                    className="fr-accordion__btn"
                    aria-expanded={expandedSection === sectionName}
                    onClick={() => toggleSection(sectionName)}
                  >
                    {sectionName} ({sectionChamps.length} réponses)
                    {hasMappableFields && (
                      <span className="fr-badge fr-badge--sm fr-badge--purple-glycine fr-ml-1w">
                        RGA
                      </span>
                    )}
                  </button>
                </h3>
                {expandedSection === sectionName && (
                  <div className="fr-collapse fr-collapse--expanded">
                    <table className="fr-table fr-table--sm">
                      <tbody>
                        {sectionChamps.map((champ) => {
                          const field = DS_FIELDS_ELIGIBILITE[champ.id];
                          const hasRgaMapping = field?.rgaPath !== undefined;

                          return (
                            <tr key={champ.id}>
                              <td className="fr-text--sm fr-text--bold">
                                {fieldLabels[champ.id] || champ.label}
                                {hasRgaMapping && (
                                  <span
                                    className="fr-hint-text fr-ml-1w"
                                    title={`Mappé depuis RGA: ${field.rgaPath}`}
                                  >
                                    (RGA)
                                  </span>
                                )}
                              </td>
                              <td className="fr-text--sm">
                                {formatFieldValue(champ)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Afficher les champs non renseignés qui auraient pu être mappés */}
          {dossier.champs &&
            (() => {
              const missingMappableFields = Object.values(
                DS_FIELDS_ELIGIBILITE
              ).filter(
                (field) =>
                  field.rgaPath &&
                  !dossier.champs?.some((champ) => champ.id === field.id)
              );

              if (missingMappableFields.length > 0) {
                return (
                  <div className="fr-alert fr-alert--info fr-alert--sm fr-mt-2w">
                    <p className="fr-alert__title">Champs RGA non remplis</p>
                    <p className="fr-text--sm">
                      {missingMappableFields.length} champ(s) auraient pu être
                      préremplis depuis RGA :
                    </p>
                    <ul className="fr-text--sm">
                      {missingMappableFields.map((field) => (
                        <li key={field.id}>
                          {field.label} ({field.section})
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}

          {/* Lien vers DS */}
          <div className="fr-mt-3w">
            <a
              href={`https://www.demarches-simplifiees.fr/dossiers/${dossierNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="fr-btn fr-btn--sm fr-btn--secondary"
            >
              Voir sur Démarches Simplifiées
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
