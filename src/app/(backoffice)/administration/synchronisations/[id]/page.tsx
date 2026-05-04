import { redirect } from "next/navigation";
import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import SyncRunDetailPanel from "./components/SyncRunDetailPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SyncRunDetailPage({ params }: PageProps) {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isSuperAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  const { id } = await params;
  return <SyncRunDetailPanel runId={id} />;
}
