"use client";

import { useAuth, AUTH_METHODS, ROLES } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MonCompteLoading from "../../components/Loading/Loading";

export default function MonCompteClient() {
  const { user, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirection si pas d'utilisateur ou mauvais rôle
  useEffect(() => {
    // Si on est en train de charger, rediriger ou se déconnecter, on ne fait rien
    if (isLoading || isRedirecting || isLoggingOut) return;

    // Si pas d'utilisateur ou mauvais rôle
    if (!user || user.role !== ROLES.PARTICULIER) {
      setIsRedirecting(true);
      router.push("/connexion");
    }
  }, [isLoading, user, router, isRedirecting, isLoggingOut]);

  // Afficher un message de déconnexion
  if (isLoggingOut) {
    return (
      <div className="fr-container fr-py-8w">
        <div className="fr-alert fr-alert--info">
          <p className="fr-alert__title">Déconnexion en cours...</p>
          <p>Vous allez être redirigé.</p>
        </div>
      </div>
    );
  }

  // Gestion du chargement initial
  if (isLoading) {
    return <MonCompteLoading />;
  }

  // Si redirection en cours (pas d'user ou mauvais rôle) - ne rien afficher
  if (isRedirecting || !user) {
    return null;
  }

  // Contenu normal de la page
  return (
    <>
      <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
        Bienvenue {user.firstName}
      </h1>

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

      <div className="space-x-4 fr-mb-4w">
        <span className="fr-badge fr-badge--new">En construction</span>
        <span className="fr-badge fr-badge--success">1. Eligibilité</span>
      </div>

      <div className="fr-container">
        <div className="fr-grid-row">
          <div className="fr-col-12 fr-col-md-6">
            <div className="fr-callout fr-icon-info-line">
              <p className="fr-callout__title">A FAIRE</p>
              <p className="fr-callout__text">
                Il est essentiel de compléter et de soumettre le premier
                formulaire pour que votre dossier soit examiné par les autorités
                compétentes. Par la suite, vous recevrez une notification
                concernant les étapes à suivre.
              </p>
              <button type="button" className="fr-btn">
                Remplir le formulaire d'éligibilité
              </button>
            </div>
          </div>

          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-end">
            <div className="fr-card">
              <div className="fr-card__body">
                <h2 className="fr-card__title">
                  Mes informations personnelles
                </h2>
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
