import { getCategorieAffichage, type CategorieReponse } from "../../domain/value-objects/grille-categorisation";

interface CategorieBadgeProps {
  /** Catégorie de la réponse, lue dans la grille ; `sans_objet` et `null` ne rendent rien. */
  categorie: CategorieReponse | null;
  /** false : badge posé seul — sans la marge prévue pour un badge collé après un texte. */
  inline?: boolean;
  /** Libellé au pluriel, quand le badge accompagne un décompte. */
  pluriel?: boolean;
  /** Remplace le libellé de la catégorie, quand le badge qualifie autre chose qu'une réponse. */
  libelle?: string;
}

/**
 * Label de catégorie d'une réponse. Le texte porte l'information, la couleur ne fait que
 * la doubler. Affiché uniquement sur la réponse sélectionnée, jamais sur toutes les options.
 */
export function CategorieBadge({ categorie, inline = true, pluriel = false, libelle }: CategorieBadgeProps) {
  const affichage = getCategorieAffichage(categorie);
  if (!affichage) return null;

  return (
    <span
      className={`fr-badge fr-badge--sm${inline ? " fr-ml-1w" : ""}`}
      style={{ backgroundColor: affichage.couleur, color: "#161616" }}>
      {libelle ?? (pluriel ? affichage.pluriel : affichage.label)}
    </span>
  );
}
