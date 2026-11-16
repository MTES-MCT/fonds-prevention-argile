import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireAvis } from "@/features/avis/components/FormulaireAvis";
import { titreAvis } from "@/features/avis/domain/value-objects/avis";
import { lienAvisSchema } from "@/features/avis/domain/value-objects/avis.schema";

export const metadata: Metadata = {
  title: "Votre avis | Fonds Prévention Argile",
  robots: "noindex, nofollow",
  // L'URL porte l'identifiant du parcours : il ne doit pas partir vers un site tiers.
  referrer: "no-referrer",
};

interface AvisPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AvisPage({ searchParams }: AvisPageProps) {
  const lien = lienAvisSchema.safeParse(await searchParams);

  return (
    <section className="fr-container fr-py-10w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8">
          {lien.success ? (
            <>
              <h1 className="fr-h3">{titreAvis(lien.data.etape)}</h1>
              <p className="fr-text--lead fr-mb-4w">Cela nous permettra d&apos;améliorer nos services.</p>
              <FormulaireAvis
                cible={{ sujet: lien.data.etape, parcoursId: lien.data.p }}
                origine="mail"
                noteInitiale={lien.data.note}
              />
            </>
          ) : (
            <div className="fr-alert fr-alert--error">
              <h1 className="fr-alert__title">Lien invalide</h1>
              <p>Ce lien ne permet pas de donner votre avis. Utilisez celui reçu par courriel.</p>
              <p className="fr-mt-4w">
                <Link href="/" className="fr-btn">
                  Retour à l&apos;accueil
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
