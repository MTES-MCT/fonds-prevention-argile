import { getCurrentUser, ROLES, ROUTES } from "@/features/auth";
import MonCompteClient from "@/features/parcours/core/components/MonCompteClient";
import { redirect } from "next/navigation";

export default async function MonComptePage() {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const user = await getCurrentUser();

  if (!user || user.role !== ROLES.PARTICULIER) {
    redirect(ROUTES.connexion.particulier);
  }

  return <MonCompteClient />;
}
