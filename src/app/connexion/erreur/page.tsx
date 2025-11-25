import { Suspense } from "react";
import Loading from "@/app/loading";
import ConnexionErreurClient from "./components/ConnexionErreurClient";

export const metadata = {
  title: "Erreur de connexion - Fonds Prévention Argile",
  description: "Une erreur s'est produite lors de la connexion",
};

export default function ConnexionErreurPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionErreurClient />
    </Suspense>
  );
}
