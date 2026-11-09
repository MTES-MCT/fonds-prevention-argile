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
} as const;

const STYLE_RANG_EXACT = {
  ...STYLE_RANG,
  background: "var(--background-action-high-blue-france)",
  color: "var(--text-inverted-blue-france)",
};

const STYLE_RANG_APPROXIMATIF = {
  ...STYLE_RANG,
  background: "var(--background-default-grey)",
  color: "var(--text-action-high-blue-france)",
  border: "2px dashed var(--border-action-high-blue-france)",
};

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
              {origine.approximative &&
                " Ce logement n'a pas de point GPS : il est placé au centre de sa commune, les distances sont approximatives."}
            </p>

            {voisins.length === 0 ? (
              <div className="fr-alert fr-alert--info fr-alert--sm">
                <p>Aucun autre dossier à ce stade dans votre périmètre.</p>
              </div>
            ) : (
              <div className="fr-grid-row fr-grid-row--gutters">
                <div className="fr-col-12 fr-col-lg-7">
                  <CarteDemandeursProches origine={origine} voisins={voisins} />
                  <p className="fr-text--xs fr-text-mention--grey fr-mt-1w fr-mb-0">
                    <span className="fr-icon-home-4-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                    Ce logement · numéro plein : position exacte · numéro en pointillés : centre de la commune
                  </p>
                </div>
                <div className="fr-col-12 fr-col-lg-5">
                  <ol className="fr-raw-list">
                    {voisins.map((voisin) => (
                      <li
                        key={voisin.href}
                        className="flex gap-3 py-3 border-t border-(--border-default-grey) first:border-t-0 first:pt-0">
                        <span
                          style={voisin.positionApproximative ? STYLE_RANG_APPROXIMATIF : STYLE_RANG_EXACT}
                          aria-hidden="true">
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
                            {voisin.positionApproximative && (
                              <p className="fr-badge fr-badge--sm fr-badge--warning fr-badge--no-icon">
                                Position approximative
                              </p>
                            )}
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
