import type { ReactNode } from "react";
import Link from "next/link";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";

interface HeaderMarqueProps {
  /** Contenu de la barre mobile (bouton menu, raccourci d'aide…) */
  navbar: ReactNode;
}

/** Bloc marque DSFR (Marianne + nom du service), partagé par le header du site et celui du tunnel. */
export function HeaderMarque({ navbar }: HeaderMarqueProps) {
  return (
    <div className="fr-header__brand fr-enlarge-link">
      <div className="fr-header__brand-top">
        <div className="fr-header__logo">
          <p className="fr-logo">
            Ministère
            <br />
            de la transition
            <br />
            écologique
          </p>
        </div>
        <div className="fr-header__navbar">{navbar}</div>
      </div>
      <div className="fr-header__service">
        <Link href={ROUTES.home} title={`Retour à l'accueil du site - Fonds prévention argile - République Française`}>
          <span className="flex flex-row items-center">
            <p className="fr-header__service-title mr-4!">Fonds prévention argile</p>
            <p className="fr-badge fr-badge--success fr-badge--no-icon">BETA</p>
          </span>
        </Link>
        <p className="fr-header__service-tagline">Retrait Gonflement des Argiles - Aides aux ménages</p>
      </div>
    </div>
  );
}
