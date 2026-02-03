import { getProspectsListAction } from "@/features/backoffice/espace-agent/prospects/actions/get-prospects-list.actions";
import { ProspectsTable } from "@/features/backoffice/espace-agent/prospects/components/ProspectsTable";

/**
 * Espace Agent - Page des prospects (Allers-Vers)
 * Liste des particuliers du territoire qui n'ont pas fait de demande à un AMO
 */
export default async function ProspectsPage() {
  const result = await getProspectsListAction();

  if (!result.success) {
    return (
      <div className="fr-container fr-py-6v">
        <h1>Mes prospects</h1>
        <div className="fr-callout fr-callout--error">
          <h3 className="fr-callout__title">Erreur</h3>
          <p className="fr-callout__text">{result.error || "Impossible de charger les prospects"}</p>
        </div>
      </div>
    );
  }

  const { prospects, totalCount, territoriesCovered } = result.data;

  return (
    <div className="fr-container fr-py-6v">
      <div className="fr-mb-4v">
        <h1>Mes prospects</h1>
        <p className="fr-text--lead">
          Particuliers de votre territoire qui n'ont pas encore sollicité d'AMO
        </p>
      </div>

      {/* Informations sur le territoire */}
      <div className="fr-callout fr-callout--blue-ecume fr-mb-4v">
        <h3 className="fr-callout__title">Votre territoire</h3>
        <p className="fr-callout__text">
          <strong>Départements :</strong>{" "}
          {territoriesCovered.departements.length > 0
            ? territoriesCovered.departements.join(", ")
            : "Aucun"}
          <br />
          {territoriesCovered.epcis.length > 0 && (
            <>
              <strong>EPCIs :</strong> {territoriesCovered.epcis.join(", ")}
            </>
          )}
        </p>
        <p className="fr-text--sm fr-mb-0">
          <strong>{totalCount}</strong> prospect{totalCount > 1 ? "s" : ""}{" "}
          dans votre territoire
        </p>
      </div>

      {/* Tableau des prospects */}
      <ProspectsTable prospects={prospects} />
    </div>
  );
}
