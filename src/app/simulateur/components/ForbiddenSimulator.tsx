"use client";

import Link from "next/link";

export default function ForbiddenSimulator() {
  return (
    <div className="fr-alert fr-alert--warning">
      <h3 className="fr-alert__title">Accès restreint</h3>
      <p>
        Le simulateur n'est pas accessible après une connexion FranceConnect
        pour des raisons de sécurité (les iframes ne sont pas autorisées).
      </p>
      <p className="fr-text--sm fr-mt-2w">
        Vous pouvez consulter votre dossier ou vous déconnecter pour accéder au
        simulateur.
      </p>
      <div className="fr-btns-group fr-btns-group--inline fr-mt-3w">
        <Link href="/mon-compte" className="fr-btn">
          Accéder à mon dossier
        </Link>
      </div>
    </div>
  );
}
