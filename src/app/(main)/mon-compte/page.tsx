import { checkParticulierAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseParticulier } from "@/shared/components";
import MonCompteClient from "@/features/parcours/core/components/MonCompteClient";
import { redirect } from "next/navigation";

export default async function MonComptePage() {
  const access = await checkParticulierAccess();

  // Si pas connecté du tout → redirect vers connexion
  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.particulier);
  }

  // Si connecté mais mauvais rôle, pas d'accès et message d'erreur
  if (!access.hasAccess) {
    return <AccesNonAutoriseParticulier />;
  }

  // Utilisateur valide
  return <MonCompteClient />;
}
