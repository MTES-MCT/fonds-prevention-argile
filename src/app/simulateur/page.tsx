import { getCurrentUser } from "@/lib/auth/server";
import { AUTH_METHODS } from "@/lib/auth/core/auth.constants";
import ForbiddenSimulator from "./components/ForbiddenSimulator";
import SimulateurClient from "./components/SimulateurClient";

export default async function SimulateurPage() {
  const user = await getCurrentUser();

  // Si connecté avec FranceConnect, bloquer
  if (user && user.authMethod === AUTH_METHODS.FRANCECONNECT) {
    return (
      <div className="fr-container fr-py-8w">
        <ForbiddenSimulator />
      </div>
    );
  }

              Si vous rencontrez des difficultés avec le simulateur, vous pouvez
  // Sinon, afficher le simulateur
  return <SimulateurClient />;
}
