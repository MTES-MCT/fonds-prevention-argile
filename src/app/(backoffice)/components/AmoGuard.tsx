import { ReactNode } from "react";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import Link from "next/link";

interface AmoGuardProps {
  children: ReactNode;
}

/**
 * Guard qui vérifie qu'un agent AMO a bien une entreprise rattachée
 * Affiche un message d'erreur explicite si ce n'est pas le cas
 *
 * Pour les autres rôles, laisse passer sans vérification
 */
export async function AmoGuard({ children }: AmoGuardProps) {
  const user = await getCurrentUser();

  // Pas connecté = laisser le middleware gérer la redirection
  if (!user) {
    return <>{children}</>;
  }

  // Pas un AMO ou AMO_ET_ALLERS_VERS = pas de vérification nécessaire
  const needsEntrepriseAmo = user.role === UserRole.AMO || user.role === UserRole.AMO_ET_ALLERS_VERS;
  if (!needsEntrepriseAmo) {
    return <>{children}</>;
  }

  // AMO ou AMO_ET_ALLERS_VERS sans entreprise rattachée = bloquer l'accès
  if (!user.entrepriseAmoId) {
    return (
      <div className="fr-container fr-py-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-alert fr-alert--warning">
              <h3 className="fr-alert__title">Configuration de votre compte incomplète</h3>
              <p>
                Votre compte AMO n&apos;est pas encore rattaché à une entreprise. Vous ne pouvez pas accéder à
                l&apos;espace de gestion des dossiers pour le moment.
              </p>
              <p>
                Veuillez contacter un administrateur du Fonds Prévention Argile pour finaliser la configuration de votre
                compte.
              </p>
            </div>

            <div className="fr-mt-4w">
              <h4>Informations de votre compte</h4>
              <ul className="fr-list">
                <li>
                  <strong>Nom :</strong> {user.firstName} {user.lastName}
                </li>
                <li>
                  <strong>Rôle :</strong> Agent AMO
                </li>
                <li>
                  <strong>Entreprise AMO :</strong> <span className="fr-text--error">Non rattachée</span>
                </li>
              </ul>
            </div>

            <div className="fr-mt-4w">
              <Link href="/deconnexion" className="fr-btn fr-btn--secondary">
                Se déconnecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AMO avec entreprise = accès autorisé
  return <>{children}</>;
}
