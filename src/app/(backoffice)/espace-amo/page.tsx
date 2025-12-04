import { redirect } from "next/navigation";
import { checkAmoAccess, checkProConnectAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";
import { getCurrentAgent } from "@/features/backoffice";

/**
 * Espace AMO - Réservé aux agents AMO
 *
 */
export default async function EspaceAmoPage() {
  // Vérifier que l'utilisateur est connecté via ProConnect
  const proConnectCheck = await checkProConnectAccess();

  // Si pas connecté du tout → redirect vers connexion agent
  if (!proConnectCheck.hasAccess && proConnectCheck.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  // Si pas ProConnect (ex: FranceConnect) : bloquer
  if (!proConnectCheck.hasAccess) {
    return <AccesNonAutoriseAmo />;
  }

  // Vérifier que l'agent est enregistré en BDD
  const agentResult = await getCurrentAgent();
  if (!agentResult.success) {
    return <AccesNonAutoriseAgentNonEnregistre />;
  }

  // Vérifier que l'utilisateur est AMO
  const amoCheck = await checkAmoAccess();
  if (!amoCheck.hasAccess) {
    return <AccesNonAutoriseAmo />;
  }

  // TODO: Afficher le contenu de l'espace AMO
  return (
    <main role="main" id="content">
      <div className="fr-container">
        <div className="fr-my-7w">
          <h1>Espace AMO</h1>
          <p className="fr-text--lead">Bienvenue dans votre espace de gestion AMO.</p>
          {/* TODO: Ajouter les composants de l'espace AMO */}
        </div>
      </div>
    </main>
  );
}
