import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { notFound, redirect } from "next/navigation";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import VulnerabilitePanel from "./components/VulnerabilitePanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page des statistiques d'usage du simulateur de vulnérabilité RGA (agrégats nationaux).
 *
 * Accessible à tout agent (ADR-0017) : admins, analyste, et agents AMO / Allers-Vers
 * (stats nationales ouvertes). Données agrégées ou anonymes, jamais nominatives.
 *
 * Suit la disponibilité du simulateur : sans simulateur en production, l'onglet n'aurait
 * rien à afficher (ADR-0030).
 */
export default async function VulnerabilitePage() {
  if (!isVulnerabiliteRgaActive()) notFound();

  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  return <VulnerabilitePanel />;
}
