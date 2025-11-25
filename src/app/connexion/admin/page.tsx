import Loading from "@/app/loading";
import { Suspense } from "react";
import ConnexionAdminClient from "./components/ConnexionAdminClient";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnexionAdminClient />
    </Suspense>
  );
}
