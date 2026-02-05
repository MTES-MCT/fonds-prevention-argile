import { redirect } from "next/navigation";
import Link from "next/link";
import { getValidationDataByToken } from "@/features/parcours/amo/actions";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";

interface ValidationAmoPageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Espace AMO - Page de validation d'une demande (via token email)
 *
 * Cette page redirige vers la page de détail de demande /espace-agent/demandes/[id]
 * qui offre une meilleure expérience utilisateur avec carte et informations complètes.
 *
 * L'accès AMO est vérifié par le layout parent (layout.tsx)
 */
export default async function ValidationAmoPage({ params }: ValidationAmoPageProps) {
  const { token } = await params;

  // Récupérer et vérifier le token côté serveur
  const result = await getValidationDataByToken(token);

  // Si le token est invalide ou expiré
  if (!result.success) {
    return (
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8">
          <div className="fr-alert fr-alert--error">
            <h3 className="fr-alert__title">Lien invalide</h3>
            <p>{result.error}</p>
            <p className="fr-mt-2w">Ce lien de validation n&apos;est plus valide. Les raisons possibles :</p>
            <ul>
              <li>Le lien a expiré (validité de 90 jours)</li>
              <li>Le lien est incorrect</li>
            </ul>
            <p className="fr-mt-4w">
              Vous pouvez consulter vos demandes d&apos;accompagnement depuis{" "}
              <Link href={ROUTES.backoffice.espaceAmo.root}>votre espace AMO</Link>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rediriger vers la page de détail de la demande
  redirect(ROUTES.backoffice.espaceAmo.demande(result.data.validationId));
}
