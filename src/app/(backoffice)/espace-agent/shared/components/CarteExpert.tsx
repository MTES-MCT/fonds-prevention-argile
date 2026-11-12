import type { ExpertAnnuaire } from "@/features/backoffice";
import { ContactExpert, ForfaitsExpert, detailExpert } from "./ContactExpert";

interface CarteExpertProps {
  expert: ExpertAnnuaire;
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
  /** Petite carte grise à titre h4, pour une carte posée dans une autre carte. */
  compacte?: boolean;
  /** Niveau du titre, quand la carte vient sous un titre de département. */
  niveauTitre?: "h3" | "h4";
}

/** Carte d'un expert : aucune variante ne doit en distinguer un des autres. */
export function CarteExpert({ expert, codeDepartement, compacte = false, niveauTitre }: CarteExpertProps) {
  const Titre = niveauTitre ?? (compacte ? "h4" : "h3");
  const detail = detailExpert(expert);
  const departement = expert.departements.find((d) => d.code === codeDepartement);
  return (
    <div className={`fr-card fr-card--no-arrow${compacte ? " fr-card--sm fr-card--grey fr-card--no-border" : ""}`}>
      <div className="fr-card__body">
        <div className="fr-card__content">
          <Titre className="fr-card__title">{expert.nom}</Titre>
          <div className="fr-card__desc">
            <div className="flex flex-col gap-2">
              <ContactExpert contact={departement} />
              <ForfaitsExpert departement={departement} />
            </div>
          </div>
          {detail && (
            <div className="fr-card__start">
              <p className="fr-card__detail">{detail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
