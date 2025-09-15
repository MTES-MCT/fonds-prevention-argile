import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/simpleAuth";
import MonCompteClient from "@/page-sections/mon-compte/MonCompteClient";

export default async function MonComptePage() {
  const user = await getCurrentUser();

  // Rediriger si pas authentifié ou pas le bon rôle
  if (!user || user.role !== "particulier") {
    redirect("/connexion");
  }

  return <MonCompteClient user={user} />;
}
