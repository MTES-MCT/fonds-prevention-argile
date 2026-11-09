import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import StructuresPanel from "./components/StructuresPanel";
import { lireCriteresHabilitation } from "./components/filtre-habilitation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ habilitation?: string | string[] }>;
}

/** Structures et leurs habilitations : AMO et Aller-vers font les rôles de leurs agents, Expert n'en donne aucun. */
export default async function StructuresPage({ searchParams }: PageProps) {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  const { habilitation } = await searchParams;
  return <StructuresPanel role={access.user.role} criteresInitiaux={lireCriteresHabilitation(habilitation)} />;
}
