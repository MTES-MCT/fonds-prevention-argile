import type { ExpertAnnuaire } from "@/features/backoffice";
import { ContactExpert, detailExpert } from "./ContactExpert";

interface CarteExpertProps {
  expert: ExpertAnnuaire;
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
  /** Petite carte et titre de niveau 4 quand la carte est dans une section déjà titrée en h3. */
  compacte?: boolean;
}

/** Carte d'un expert : aucune variante ne doit en distinguer un des autres. */
export function CarteExpert({ expert, codeDepartement, compacte = false }: CarteExpertProps) {
  const Titre = compacte ? "h4" : "h3";
  return (
    <div className={`fr-card fr-card--no-arrow${compacte ? " fr-card--sm" : ""}`}>
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
