"use client";

import type { ListeDiffusion } from "@/features/backoffice/administration/agents/services/listes-diffusion.service";

interface ListesDiffusionImpactProps {
  /** null tant que la recherche est en cours. */
  listes: ListeDiffusion[] | null;
}

const TYPE_LABELS: Record<ListeDiffusion["type"], string> = {
  amo: "AMO",
  allers_vers: "Aller-vers",
};

/**
 * Annonce l'effet de la désactivation sur les listes de diffusion des structures,
 * avant confirmation. Ces listes sont saisies à la main et rien ne les synchronise
 * avec la table des agents : le retrait doit donc être explicite.
 */
export default function ListesDiffusionImpact({ listes }: ListesDiffusionImpactProps) {
  if (listes === null) {
    return <p className="fr-hint-text">Recherche dans les listes de diffusion...</p>;
  }

  if (listes.length === 0) {
    return <p className="fr-hint-text">Son adresse ne figure dans aucune liste de diffusion de structure.</p>;
  }

  const aRetirer = listes.filter((l) => !l.estDerniereAdresse);
  const aConserver = listes.filter((l) => l.estDerniereAdresse);

  return (
    <>
      {aRetirer.length > 0 && (
        <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-2w">
          <p>
            Son adresse sera retirée de la liste de diffusion de{" "}
            {aRetirer.map((l, i) => (
              <span key={`${l.type}-${l.id}`}>
                {i > 0 && ", "}
                <strong>{l.nom}</strong> ({TYPE_LABELS[l.type]})
              </span>
            ))}
            .
          </p>
        </div>
      )}

      {aConserver.length > 0 && (
        <div className="fr-alert fr-alert--warning fr-alert--sm fr-mb-2w">
          <p>
            Son adresse est la <strong>dernière</strong> de{" "}
            {aConserver.map((l, i) => (
              <span key={`${l.type}-${l.id}`}>
                {i > 0 && ", "}
                <strong>{l.nom}</strong> ({TYPE_LABELS[l.type]})
              </span>
            ))}{" "}
            : elle est conservée pour ne pas priver la structure de destinataire. Ajoutez une adresse de remplacement,
            puis retirez celle-ci depuis la fiche de la structure.
          </p>
        </div>
      )}
    </>
  );
}
