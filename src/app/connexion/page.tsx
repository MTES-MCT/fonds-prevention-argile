import Loading from "@/app/loading";
import ConnexionFranceConnectClient from "@/page-sections/connexion/ConnexionFranceConnectClient";
import { Suspense } from "react";
// import EarlyAccessForm from "../simulateur/components/EarlyAccessForm";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionFranceConnectClient />
      {/* <EarlyAccessForm /> */}
    </Suspense>
  );
}
