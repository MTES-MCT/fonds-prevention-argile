"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { CategorieBadge } from "@/features/vulnerabilite-rga/components/shared/CategorieBadge";
import { LancerTestVulnerabiliteButton } from "@/features/vulnerabilite-rga/components/results/LancerTestVulnerabiliteButton";
import { CATEGORIES_AFFICHAGE } from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { getEtatMaVulnerabiliteAction, type EtatMaVulnerabilite } from "../../actions/ma-vulnerabilite.actions";

function libelleDecompte(categorie: "critique" | "vigilance", nombre: number): string {
  const { label, pluriel } = CATEGORIES_AFFICHAGE[categorie];
  return `${nombre} ${(nombre > 1 ? pluriel : label).toLowerCase()}`;
}

/**
 * Encart de « Ma liste » : le test de vulnérabilité est facultatif, et son résultat se relit ici.
 * Trois cas : pas encore fait, fait avec des points à traiter, fait sans point critique ni de vigilance.
 */
export default function VulnerabiliteMaListe() {
  const [etat, setEtat] = useState<EtatMaVulnerabilite | null>(null);

  useEffect(() => {
    if (!isVulnerabiliteRgaActive()) return;
    let annule = false;
    getEtatMaVulnerabiliteAction().then((resultat) => {
      if (!annule && resultat.success) setEtat(resultat.data);
    });
    return () => {
      annule = true;
    };
  }, []);

  // Feature hors production tant que la grille n'est pas validée (ADR-0030).
  if (!etat || !isVulnerabiliteRgaActive()) return null;

  const { resume, adresse } = etat;

  return (
    <div className="fr-mt-3w p-3 bg-(--background-alt-grey)" data-testid="vulnerabilite-ma-liste">
      {!resume && (
        <>
          <p className="fr-text--sm fr-mb-1v">Tester la vulnérabilité de mon logement</p>
          <p className="fr-mb-1w">
            <span className="fr-badge fr-badge--sm fr-badge--info">Facultatif</span>
          </p>
          <LancerTestVulnerabiliteButton
            adresse={adresse}
            className="fr-link fr-link--sm fr-icon-arrow-right-line fr-link--icon-right">
            Faire le test (5 min)
          </LancerTestVulnerabiliteButton>
        </>
      )}

      {resume && (
        <>
          <p className="fr-text--sm fr-mb-1w">
            Test de vulnérabilité ({new Date(resume.date).toLocaleDateString("fr-FR")})
          </p>

          {resume.niveau === "aucun" ? (
            <>
              <p className="fr-mb-1w">
                <CategorieBadge categorie="bonne_pratique" inline={false} libelle="Aucun point critique" />
              </p>
              <p className="fr-text--sm fr-mb-1w">Vous êtes au top, bravo !</p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 fr-mb-1w">
                {resume.compte.critique > 0 && (
                  <CategorieBadge
                    categorie="critique"
                    inline={false}
                    libelle={libelleDecompte("critique", resume.compte.critique)}
                  />
                )}
                {resume.compte.vigilance > 0 && (
                  <CategorieBadge
                    categorie="vigilance"
                    inline={false}
                    libelle={libelleDecompte("vigilance", resume.compte.vigilance)}
                  />
                )}
              </div>
              {/*<p className="fr-text--sm fr-mb-1w">À traiter en priorité : {resume.pointsPrioritaires.join(", ")}.</p>*/}
            </>
          )}

          <Link
            href={ROUTES.particulier.maVulnerabilite}
            className="fr-link fr-link--sm fr-icon-arrow-right-line fr-link--icon-right">
            {resume.niveau === "aucun" ? "Voir plus" : "Voir le détail"}
          </Link>
        </>
      )}
    </div>
  );
}
