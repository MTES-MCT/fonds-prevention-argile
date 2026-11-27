import Image from "next/image";
import type { ReactNode } from "react";

interface Legende {
  icon: string;
  text: string;
}

interface Props {
  numero: number;
  titre: string;
  chapeau: string;
  image: { src: string; alt: string; width: number; height: number };
  /** Légendes des moitiés gauche puis droite de l'image, qu'une barre sépare alors en deux. */
  legendes?: Legende[];
  className?: string;
  imageADroite?: boolean;
  /** Première image visible de la page : chargée sans attendre. */
  imagePrioritaire?: boolean;
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
  className = "",
  imageADroite = false,
  imagePrioritaire = false,
  children,
  complement,
}: Props) {
  return (
    <section className={`fr-container-fluid fr-py-8w ${className}`}>
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters items-center">
          {/* Texte d'abord dans le DOM : le titre précède l'image au lecteur d'écran et sur mobile. */}
          <div className="fr-col-12 fr-col-md-6">
            <div className="flex items-center gap-3 fr-mb-2w">
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
              {legendes && (
                <figcaption className="grid grid-cols-2 gap-8 fr-pb-2w">
                  {legendes.map((legende) => (
                    <p key={legende.text} className="fr-text--sm fr-mb-0">
                      <span className={`${legende.icon} fr-icon--sm fr-mr-1v`} aria-hidden="true" />
                      {legende.text}
                    </p>
                  ))}
                </figcaption>
              )}
              <Image
                alt={image.alt}
                className="w-full h-auto"
                height={image.height}
                priority={imagePrioritaire}
                quality={85}
                sizes="(max-width: 768px) 100vw, 50vw"
                src={image.src}
                width={image.width}
              />
              {legendes && (
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
