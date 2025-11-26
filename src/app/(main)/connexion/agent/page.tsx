import { Suspense } from "react";
import ConnexionProConnectClient from "./components/ConnexionProConnectClient";
import Loading from "../../loading";

export const metadata = {
  title: "Connexion Agent - Fonds Prévention Argile",
  description: "Connexion pour les agents publics via ProConnect au service Fonds Prévention Argile",
};

export default function ConnexionAgentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionProConnectClient />
    </Suspense>
  );
}
