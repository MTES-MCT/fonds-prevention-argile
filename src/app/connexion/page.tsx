import Loading from "@/components/Loading/Loading";
import { Suspense } from "react";
import EarlyAccessForm from "../simulateur/components/EarlyAccessForm";
import ConnexionFranceConnectClient from "@/page-sections/connexion/ConnexionFranceConnectClient";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionFranceConnectClient />
      {/* <EarlyAccessForm /> */}
    </Suspense>
  );
}
