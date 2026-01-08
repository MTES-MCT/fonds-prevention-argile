import ForbiddenSimulator from "@/app/(main)/simulateur/components/ForbiddenSimulator";
import { AUTH_METHODS, getCurrentUser } from "@/features/auth";
import { SimulateurFormulaire } from "@/features/simulateur";

export default async function EmbedSimulateurPage() {
  const user = await getCurrentUser();

  // Si connecté avec FranceConnect, bloquer
  if (user && user.authMethod === AUTH_METHODS.FRANCECONNECT) {
    return (
      <div className="w-full">
        <ForbiddenSimulator />
      </div>
    );
  }

  // Afficher le simulateur en mode embed
  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <SimulateurFormulaire />
    </div>
  );
}
