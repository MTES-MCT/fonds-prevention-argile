import type { ExpertAnnuaire } from "@/features/backoffice";
import { ContactExpert, detailExpert } from "./ContactExpert";

interface CarteExpertProps {
  expert: ExpertAnnuaire;
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
  /** Petite carte grise à titre h4, pour une carte posée dans une autre carte. */
  compacte?: boolean;
}

/** Carte d'un expert : aucune variante ne doit en distinguer un des autres. */
export function CarteExpert({ expert, codeDepartement, compacte = false }: CarteExpertProps) {
  const Titre = compacte ? "h4" : "h3";
  return (
    <div className={`fr-card fr-card--no-arrow${compacte ? " fr-card--sm fr-card--grey fr-card--no-border" : ""}`}>
      <div className="fr-card__body">
        <div className="fr-card__content">
          <Titre className="fr-card__title">{expert.nom}</Titre>
          <div className="fr-card__desc">
            <ContactExpert contact={expert.departements.find((d) => d.code === codeDepartement)} />
          </div>
          <div className="fr-card__start">
            <p className="fr-card__detail">{detailExpert(expert)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
