import type { DemandeursProches as DemandeursProchesData } from "@/features/backoffice/espace-agent/demandeurs-proches/services/demandeurs-proches.service";
import { CarteDemandeursProches } from "./CarteDemandeursProches";

interface DemandeursProchesProps {
  donnees: DemandeursProchesData;
}

const STYLE_RANG = {
  width: "1.5rem",
  height: "1.5rem",
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  fontWeight: 700,
  fontSize: "0.75rem",
  background: "var(--background-action-high-blue-france)",
  color: "var(--text-inverted-blue-france)",
} as const;

/** Carte de la fiche dossier : les demandeurs les plus proches, pour regrouper les visites. */
export function DemandeursProches({ donnees }: DemandeursProchesProps) {
  const { origine, etapes, mesDossiers, voisins } = donnees;
  const qui = mesDossiers ? "Vos dossiers" : "Les dossiers de votre périmètre";

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-map-pin-2-line fr-mr-2v" aria-hidden="true"></span>
            Demandeurs proches
          </h3>
          <div className="fr-card__desc">
            <p className="fr-text--sm fr-text-mention--grey fr-mt-1w fr-mb-2w">
              {qui} {etapes} les plus proches de ce logement, pour regrouper les visites.
            </p>

            {voisins.length === 0 ? (
              <div className="fr-alert fr-alert--info fr-alert--sm">
                <p>Aucun autre dossier à ce stade dans votre périmètre.</p>
              </div>
            ) : (
              <div className="fr-grid-row fr-grid-row--gutters">
                <div className="fr-col-12 fr-col-lg-8">
                  <CarteDemandeursProches origine={origine} voisins={voisins} />
                  <p className="fr-text--xs fr-text-mention--grey fr-mt-1w fr-mb-0">
                    <span className="fr-icon-home-4-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                    Ce logement · les numéros renvoient à la liste
                  </p>
                </div>
                <div className="fr-col-12 fr-col-lg-4">
                  <ol className="fr-raw-list">
                    {voisins.map((voisin) => (
                      <li
                        key={voisin.href}
                        className="flex gap-3 py-3 border-t border-(--border-default-grey) first:border-t-0 first:pt-0">
                        <span style={STYLE_RANG} aria-hidden="true">
                          {voisin.rang}
                        </span>
                        <div>
                          <a
                            className="fr-link fr-text--bold"
                            href={voisin.href}
                            target="_blank"
                            rel="noopener"
                            title={`${voisin.nom} - nouvelle fenêtre`}>
                            {voisin.nom}
                          </a>
                          <p className="fr-text--sm fr-text-mention--grey fr-mb-1v">
                            {voisin.commune ?? "Commune inconnue"}
                            {voisin.codeDepartement && ` (${voisin.codeDepartement})`} · {voisin.distance} à vol
                            d&apos;oiseau
                          </p>
                          <div className="fr-badges-group">
                            <p className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">{voisin.etape}</p>
                            {voisin.chezLaDdt && <p className="fr-badge fr-badge--sm">Chez la DDT</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
