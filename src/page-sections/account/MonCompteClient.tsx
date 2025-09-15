"use client";

import { useAuth, AUTH_METHODS, ROLES } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MonCompteLoading from "../../components/Loading/Loading";

export default function MonCompteClient() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Gestion du chargement
  if (isLoading) {
    return <MonCompteLoading />;
  }

  // Redirection si pas d'utilisateur
  useEffect(() => {
    if (!isLoading && user && user.role !== ROLES.PARTICULIER) {
      router.push("/connexion");
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-alert fr-alert--success fr-mb-4w">
          <p className="fr-alert__title">Connexion réussie</p>
          <p>
            Vous êtes connecté via{" "}
            {user.authMethod === AUTH_METHODS.FRANCECONNECT
              ? "FranceConnect"
              : "mot de passe administrateur"}
            .
          </p>
        </div>
      </div>

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-card">
          <div className="fr-card__body">
            <h2 className="fr-card__title">Mes informations personnelles</h2>
            <div className="fr-card__desc">
              <dl className="fr-my-2w">
                {user.firstName && (
                  <>
                    <dt className="fr-text--bold">Prénom :</dt>
                    <dd className="fr-mb-2w">{user.firstName}</dd>
                  </>
                )}
                {user.lastName && (
                  <>
                    <dt className="fr-text--bold">Nom :</dt>
                    <dd className="fr-mb-2w">{user.lastName}</dd>
                  </>
                )}
                {user.email && (
                  <>
                    <dt className="fr-text--bold">Email :</dt>
                    <dd className="fr-mb-2w">{user.email}</dd>
                  </>
                )}

                <dt className="fr-text--bold">Type de compte :</dt>
                <dd className="fr-mb-2w">
                  {user.role === ROLES.PARTICULIER
                    ? "Particulier"
                    : "Administrateur"}
                </dd>

                <dt className="fr-text--bold">Méthode de connexion :</dt>
                <dd>
                  {user.authMethod === AUTH_METHODS.FRANCECONNECT ? (
                    <span className="fr-badge fr-badge--success">
                      FranceConnect
                    </span>
                  ) : (
                    <span className="fr-badge">Mot de passe</span>
                  )}
                </dd>
              </dl>
            </div>
          </div>

          <div className="fr-card__footer">
            <button
              className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-logout-box-r-line"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Déconnexion en cours..." : "Se déconnecter"}
            </button>
            {user.authMethod === AUTH_METHODS.FRANCECONNECT && (
              <p className="fr-text--xs fr-mt-1w">
                Vous serez également déconnecté de FranceConnect
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
