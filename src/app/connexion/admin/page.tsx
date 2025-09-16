import Loading from "@/components/Loading/Loading";
import ConnexionAdminClient from "@/page-sections/connexion/ConnexionAdminClient";
import { Suspense } from "react";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionAdminClient />
    </Suspense>
  );
}
