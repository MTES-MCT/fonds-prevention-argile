import Loading from "@/app/loading";
import { Suspense } from "react";
import ConnexionFranceConnectClient from "./components/ConnexionFranceConnectClient";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionFranceConnectClient />
    </Suspense>
  );
}
