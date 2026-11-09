import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import FicheStructurePanel from "../components/FicheStructurePanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Fiche d'une structure : identité, habilitations et agents. */
export default async function FicheStructurePage({ params }: PageProps) {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  const { id } = await params;
  return <FicheStructurePanel structureId={id} role={access.user.role} />;
}
