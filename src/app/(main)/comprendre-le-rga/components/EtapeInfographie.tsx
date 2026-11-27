import Image from "next/image";
import type { ReactNode } from "react";

interface Legende {
  icon?: string;
  titre?: string;
  text: string;
  /** Tracé SVG, en pixels de l'image, d'une flèche qui part du bas de l'image vers ce que la légende décrit. */
  fleche?: string;
}

interface Props {
  numero: number;
  titre: string;
  chapeau: string;
  image: { src: string; alt: string; width: number; height: number };
  /** Légendes posées sous l'image, dans l'ordre de ses moitiés gauche puis droite. */
  legendes?: Legende[];
  /** Barre verticale qui partage l'image et ses légendes en deux. */
  separateur?: boolean;
  className?: string;
  imageADroite?: boolean;
  children: ReactNode;
  /** Contenu pleine largeur, sous la ligne image + texte. */
  complement?: ReactNode;
}

export default function EtapeInfographie({
  numero,
  titre,
  chapeau,
  image,
  legendes,
  separateur = false,
  className = "",
  imageADroite = false,
  children,
  complement,
}: Props) {
  const fleches = legendes?.flatMap((legende) => (legende.fleche ? [legende.fleche] : [])) ?? [];
  const pointeId = `pointe-fleche-${numero}`;

  return (
    <section className={`fr-container-fluid fr-py-8w ${className}`}>
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters items-center">
          {/* Texte d'abord dans le DOM : le titre précède l'image au lecteur d'écran et sur mobile. */}
          <div className="fr-col-12 fr-col-md-6 text-center">
            <div className="flex items-center justify-center gap-3 fr-mb-2w">
              <span
                className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full fr-text--lg fr-text--bold fr-mb-0 bg-(--background-action-high-blue-france) text-(--text-inverted-blue-france)"
                aria-hidden="true">
                {numero}
              </span>
              <h2 className="fr-mb-0">
                <span className="fr-sr-only">{numero}. </span>
                {titre}
              </h2>
            </div>
            <p className="fr-text--lead">{chapeau}</p>
            {children}
          </div>

          <div className={`fr-col-12 fr-col-md-6 ${imageADroite ? "" : "md:order-first"}`}>
            <figure className="relative m-0">
              <div className="relative">
                <Image
                  alt={image.alt}
                  className="block w-full h-auto"
                  height={image.height}
                  quality={85}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  src={image.src}
                  width={image.width}
                />
                {fleches.length > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full text-(--text-action-high-blue-france)"
                    viewBox={`0 0 ${image.width} ${image.height}`}
                    aria-hidden="true">
                    <defs>
                      <marker id={pointeId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                        <path d="M0 0 L5 2.5 L0 5 Z" fill="currentColor" />
                      </marker>
                    </defs>
                    {fleches.map((trace) => (
                      <path
                        key={trace}
                        d={trace}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        markerEnd={`url(#${pointeId})`}
                      />
                    ))}
                  </svg>
                )}
              </div>
              {legendes && (
                <figcaption className="grid grid-cols-2 border border-t-0 border-solid border-(--border-default-grey) bg-(--background-default-grey)">
                  {legendes.map((legende) => (
                    <p key={legende.text} className="fr-text--sm fr-mb-0 fr-p-2w text-left">
                      {legende.icon && <span className={`${legende.icon} fr-icon--sm fr-mr-1v`} aria-hidden="true" />}
                      {legende.titre && (
                        <>
                          <span className="fr-text--bold">{legende.titre}</span>
                          <br />
                        </>
                      )}
                      {legende.text}
                    </p>
                  ))}
                </figcaption>
              )}
              {separateur && (
                <span
                  className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-(--border-action-high-blue-france)"
                  aria-hidden="true"
                />
              )}
            </figure>
          </div>
        </div>

        {complement}
      </div>
    </section>
  );
}
