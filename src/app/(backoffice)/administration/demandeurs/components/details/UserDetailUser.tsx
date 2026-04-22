"use client";

import { UserWithParcoursDetails } from "@/features/backoffice";
import { formatDateTime } from "@/shared/utils/date.utils";

interface UserDetailUserProps {
  user: UserWithParcoursDetails;
}

export function UserDetailUser({ user }: UserDetailUserProps) {
  return (
    <div>
      <h3 className="fr-h6 fr-mb-3w">Informations utilisateur</h3>

      <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
        {/* Prénom */}
        <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
          <div className="fr-col-12 fr-col-md-4">
            <dt className="fr-text--regular fr-mb-0">Prénom</dt>
          </div>
          <div className="fr-col-12 fr-col-md-8">
            <dd className="fr-text--bold fr-mb-0">{user.user.firstName || "—"}</dd>
          </div>
        </div>

        {/* Nom */}
        <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
          <div className="fr-col-12 fr-col-md-4">
            <dt className="fr-text--regular fr-mb-0">Nom</dt>
          </div>
          <div className="fr-col-12 fr-col-md-8">
            <dd className="fr-text--bold fr-mb-0">{user.user.name || "—"}</dd>
          </div>
        </div>

        {/* Email */}
        <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
          <div className="fr-col-12 fr-col-md-4">
            <dt className="fr-text--regular fr-mb-0">Email</dt>
          </div>
          <div className="fr-col-12 fr-col-md-8">
            <dd className="fr-text--bold fr-mb-0">{user.user.email || "—"}</dd>
          </div>
        </div>

        {/* Téléphone */}
        <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
          <div className="fr-col-12 fr-col-md-4">
            <dt className="fr-text--regular fr-mb-0">Téléphone</dt>
          </div>
          <div className="fr-col-12 fr-col-md-8">
            <dd className="fr-text--bold fr-mb-0">{user.user.telephone || "—"}</dd>
          </div>
        </div>

        {/* Date d'inscription */}
        <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
          <div className="fr-col-12 fr-col-md-4">
            <dt className="fr-text--regular fr-mb-0">Date d'inscription</dt>
          </div>
          <div className="fr-col-12 fr-col-md-8">
            <dd className="fr-text--bold fr-mb-0">{formatDateTime(user.user.createdAt.toISOString())}</dd>
          </div>
        </div>

        {/* Dernière connexion */}
        <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
          <div className="fr-col-12 fr-col-md-4">
            <dt className="fr-text--regular fr-mb-0">Dernière connexion</dt>
          </div>
          <div className="fr-col-12 fr-col-md-8">
            <dd className="fr-text--bold fr-mb-0">{formatDateTime(user.user.lastLogin.toISOString())}</dd>
          </div>
        </div>
      </div>
    </div>
  );
}
