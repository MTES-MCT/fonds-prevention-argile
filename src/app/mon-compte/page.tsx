import { redirect } from "next/navigation";
import { getCurrentUser, ROLES } from "@/lib/auth/server";
import MonCompteClient from "@/page-sections/account/MonCompteClient";
import { ParcoursProvider } from "@/lib/parcours/context/ParcoursProvider";

export default async function MonComptePage() {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const user = await getCurrentUser();

  if (!user || user.role !== ROLES.PARTICULIER) {
    redirect("/connexion");
  }

  return (
    <ParcoursProvider autoSync={false}>
      <MonCompteClient />
    </ParcoursProvider>
  );
}
