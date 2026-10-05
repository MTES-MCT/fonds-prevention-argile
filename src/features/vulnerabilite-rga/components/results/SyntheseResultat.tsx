import type { NiveauSynthese, SyntheseResultat as Synthese } from "../../domain/services/synthese-resultat.service";

// Mise en avant DSFR plutôt qu'Alerte : contenu éditorial, pas un retour système. L'icône
// et le titre doublent la couleur d'accent.
const CLASSES_NIVEAU: Record<NiveauSynthese, string> = {
  critique: "fr-callout--pink-tuile fr-icon-error-warning-line",
  vigilance: "fr-callout--yellow-moutarde fr-icon-warning-line",
  aucun: "fr-callout--green-emeraude fr-icon-checkbox-circle-line",
};

interface SyntheseResultatProps {
  synthese: Synthese;
}

export function SyntheseResultat({ synthese }: SyntheseResultatProps) {
  return (
    <div className={`fr-callout ${CLASSES_NIVEAU[synthese.niveau]} fr-mb-4w`}>
      <h2 className="fr-callout__title">{synthese.titre}</h2>
      <p className="fr-callout__text">{synthese.texte}</p>
    </div>
  );
}
