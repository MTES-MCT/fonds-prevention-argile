import { redirect } from "next/navigation";
import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import ActivitePanel from "./components/ActivitePanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ActivitePage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  return <ActivitePanel />;
}
