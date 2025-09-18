import { contentAccountPage } from "@/content";
import Link from "next/link";

export default function MaListe() {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <h2 className="fr-card__title">{contentAccountPage.ma_liste.title}</h2>
        <div className="fr-card__desc">
          <ol type="1" className="fr-list space-y-2">
            {contentAccountPage.ma_liste.steps.map((step, index) => (
              <li key={`ma-liste-step-${index}`}>
                <Link
                  target="_blank"
                  rel="noopener external"
                  className="fr-link"
                  href={step.url}
                >
                  {step.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
