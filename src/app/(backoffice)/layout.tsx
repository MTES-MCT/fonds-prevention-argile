import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { AuthProvider, ROUTES } from "@/features/auth/client";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { AUTH_METHODS } from "@/features/auth/domain/value-objects/constants";
import { Header, Matomo } from "@/shared/components";

interface BackofficeLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour le backoffice agents (ProConnect)
 *
 * Vérifie que l'utilisateur est connecté via ProConnect
 * Redirige vers /connexion/agent sinon
 */
export default async function BackofficeLayout({ children }: BackofficeLayoutProps) {
  const user = await getCurrentUser();

  // Vérifier l'authentification ProConnect
  if (!user || user.authMethod !== AUTH_METHODS.PROCONNECT) {
    redirect(ROUTES.connexion.agent);
  }

  return (
    <AuthProvider>
      <Matomo />
      {/* TODO: Créer un BackofficeHeader spécifique avec navigation selon rôle */}
      <Header />
      <main className="flex-1">{children}</main>
      {/* Pas de Footer dans le backoffice pour maximiser l'espace de travail */}
    </AuthProvider>
  );
}
