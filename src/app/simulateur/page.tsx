import { getCurrentUser } from "@/lib/auth/server";
import { AUTH_METHODS } from "@/lib/auth/core/auth.constants";
import ForbiddenSimulator from "./components/ForbiddenSimulator";
import SimulateurClient from "./components/SimulateurClient";
import { contentHomePage } from "@/content";
import { Notice } from "@/components";

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

  // Sinon, afficher le simulateur
  return (
    <>
      <Notice
        className="fr-notice--info"
        description={contentHomePage.notice.description}
        title={contentHomePage.notice.title}
        more={contentHomePage.notice.more}
        more_link={contentHomePage.notice.more_link}
        buttonClose={true}
      />
      <div>
        <SimulateurClient />;
      </div>
    </>
  );
}
