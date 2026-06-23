import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { AmoStatistiquesHeader } from "./components";
import { AmoStatistiquesPanel } from "./components/AmoStatistiquesPanel";

/**
 * Espace AMO - Page des statistiques
 */
export default async function StatistiquesAmoPage() {
  // Ces stats sont AMO-centrées : sans objet pour l'analyste, dont les stats sont
  // dans /administration. On l'empêche d'y accéder par URL directe.
  const user = await getCurrentUser();
  if (user?.role === UserRole.ANALYSTE) {
    redirect("/espace-agent/dossiers");
  }

  return (
    <>
      <AmoStatistiquesHeader />
      <AmoStatistiquesPanel />
    </>
  );
}
