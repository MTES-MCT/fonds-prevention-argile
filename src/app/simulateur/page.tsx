import ForbiddenSimulator from "./components/ForbiddenSimulator";
import content from "../(home)/content/content.json";
import { AUTH_METHODS, getCurrentUser } from "@/features/auth";
import { Notice } from "@/shared/components";
import { SimulateurClient } from "@/features/simulateur-rga";

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
        description={content.notice.description}
        title={content.notice.title}
        more={content.notice.more}
        more_link={content.notice.more_link}
        buttonClose={true}
      />
      <div>
        <SimulateurClient />;
      </div>
    </>
  );
}
