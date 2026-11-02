"use client";

import Link from "next/link";
import { estDoublonBloquant, type DoublonDemandeur } from "../domain/doublon";

interface AlerteDoublonProps {
  doublon: DoublonDemandeur;
  /** Créer malgré une alerte « même logement » ; sans effet sur un doublon d'email. */
  onConfirmer?: () => void;
  isLoading?: boolean;
}

export function AlerteDoublon({ doublon, onConfirmer, isLoading }: AlerteDoublonProps) {
  const bloquant = estDoublonBloquant(doublon.motif);
  const peutConfirmer = !bloquant && !!onConfirmer;

  return (
    <div className={`fr-alert ${bloquant ? "fr-alert--error" : "fr-alert--warning"} fr-mt-2w`} role="alert">
      <h3 className="fr-alert__title">
        {bloquant ? "Ce demandeur est déjà connu" : "Un dossier existe déjà pour ce logement"}
      </h3>
      <p>{doublon.message}</p>
      {(doublon.lien || peutConfirmer) && (
        <ul className="fr-btns-group fr-btns-group--inline-sm fr-mt-2w">
          {doublon.lien && (
            <li>
              <Link className="fr-btn fr-btn--secondary" href={doublon.lien}>
                Ouvrir le dossier existant
              </Link>
            </li>
          )}
          {peutConfirmer && (
            <li>
              <button type="button" className="fr-btn fr-btn--tertiary" onClick={onConfirmer} disabled={isLoading}>
                C&apos;est un autre demandeur, créer le dossier
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
