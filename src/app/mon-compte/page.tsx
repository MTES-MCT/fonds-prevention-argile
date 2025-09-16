import { redirect } from "next/navigation";
import { getCurrentUser, ROLES } from "@/lib/auth/server";
import { Suspense } from "react";
import MonCompteClient from "@/page-sections/account/MonCompteClient";
import Loading from "@/components/Loading/Loading";

export default async function MonComptePage() {
  const user = await getCurrentUser();

  if (!user || user.role !== ROLES.PARTICULIER) {
    redirect("/connexion");
  }

  return (
    <Suspense
      fallback={
        <section className="fr-container-fluid fr-py-10w">
          <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
            <Loading />
          </div>
        </section>
      }
    >
      <MonCompteClient />
    </Suspense>
  );
}
