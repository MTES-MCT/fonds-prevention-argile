import { Suspense } from "react";
import ConnexionFranceConnectClient from "./components/ConnexionFranceConnectClient";
import Loading from "../../loading";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionFranceConnectClient />
    </Suspense>
  );
}
