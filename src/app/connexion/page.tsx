import Loading from "@/components/Loading/Loading";
import ConnexionFranceConnectClient from "@/page-sections/connexion/ConnexionFranceConnectClient";
import { Suspense } from "react";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionFranceConnectClient />
    </Suspense>
  );
}
