import Loading from "@/app/loading";
import ConnexionFranceConnectClient from "@/page-sections/connexion/ConnexionFranceConnectClient";
import { Suspense } from "react";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionFranceConnectClient />
    </Suspense>
  );
}
