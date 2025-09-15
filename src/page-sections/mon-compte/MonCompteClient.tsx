"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/auth.types";

interface MonCompteClientProps {
  user: AuthUser;
}

export default function MonCompteClient({ user }: MonCompteClientProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Utiliser la route de déconnexion FranceConnect
      await fetch("/api/auth/fc/logout", {
        method: "POST",
      });
      // La redirection est gérée par l'API
      window.location.href = "/";
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setIsLoggingOut(false);
    }
  };

  const handleCreateDossier = () => {
    // TODO: Implémenter la création de dossier Démarches Simplifiées
    alert(
      "Fonctionnalité à venir : Création de dossier avec données pré-remplies"
    );
  };

  return (
    <section className="fr-container fr-py-8w">
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12">
          <h1>Mon compte</h1>

          {/* Alerte de connexion réussie */}
          <div className="fr-alert fr-alert--success fr-mb-4w">
            <p className="fr-alert__title">Connexion réussie</p>
            <p>
              Vous êtes connecté via FranceConnect avec votre compte{" "}
              {user.authMethod === "franceconnect"
                ? "FranceConnect"
                : "administrateur"}
              .
            </p>
          </div>

          {/* Informations personnelles */}
          <div className="fr-card fr-mb-4w">
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
                    {user.role === "particulier"
                      ? "Particulier"
                      : "Administrateur"}
                  </dd>
                  <dt className="fr-text--bold">Méthode de connexion :</dt>
                  <dd>
                    {user.authMethod === "franceconnect" ? (
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
          </div>

          {/* Actions disponibles */}
          <div className="fr-card">
            <div className="fr-card__body">
              <h2 className="fr-card__title">Actions disponibles</h2>
              <div className="fr-card__desc">
                <p className="fr-text--sm fr-mb-3w">
                  Gérez vos dossiers et vos informations personnelles.
                </p>

                <ul className="fr-btns-group fr-btns-group--inline">
                  <li>
                    <button className="fr-btn" onClick={handleCreateDossier}>
                      Créer un dossier Démarches Simplifiées
                    </button>
                  </li>
                  <li>
                    <button
                      className="fr-btn fr-btn--secondary"
                      onClick={() => router.push("/mes-dossiers")}
                      disabled
                    >
                      Consulter mes dossiers
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Déconnexion */}
          <div className="fr-mt-6w">
            <hr />
            <div className="fr-mt-4w">
              <button
                className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-logout-box-r-line"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Déconnexion en cours..." : "Se déconnecter"}
              </button>
              {user.authMethod === "franceconnect" && (
                <p className="fr-text--xs fr-mt-1w">
                  Vous serez également déconnecté de FranceConnect
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
