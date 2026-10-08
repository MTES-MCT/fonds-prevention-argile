"use client";

import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { VulnerabilitePdfDocument } from "./VulnerabilitePdfDocument";
import { getIllustrationIds, rasteriserIllustrations, type IllustrationsPdf } from "./rasteriser-illustrations";
import { useMatomo } from "@/shared/components/Matomo/useMatomo";
import { MATOMO_EVENTS } from "@/shared/constants";
import type { SectionRecommandations } from "../../domain/services/recommandations.service";
import type { SyntheseResultat } from "../../domain/services/synthese-resultat.service";

const CLASSES_BOUTON = "fr-btn fr-btn--secondary !w-full md:!w-auto justify-center fr-mb-2w md:fr-mb-0 md:fr-mr-2w";

interface TelechargerPdfButtonProps {
  synthese: SyntheseResultat;
  sections: SectionRecommandations[];
  eligibleFonds: boolean;
}

/**
 * Isolé dans son propre module pour être chargé en `next/dynamic` depuis l'écran de
 * résultat : c'est le seul point d'entrée vers `@react-pdf/renderer` (~256 Ko gzip).
 */
export function TelechargerPdfButton({ synthese, sections, eligibleFonds }: TelechargerPdfButtonProps) {
  const { trackEvent } = useMatomo();
  const [illustrations, setIllustrations] = useState<IllustrationsPdf | null>(null);
  // Clé texte : `sections` est recalculé à chaque rendu du parent, la liste d'ids non.
  const cleIllustrations = getIllustrationIds(sections).join(",");

  useEffect(() => {
    let annule = false;
    rasteriserIllustrations(cleIllustrations ? cleIllustrations.split(",") : []).then((resultat) => {
      if (!annule) setIllustrations(resultat);
    });
    return () => {
      annule = true;
    };
  }, [cleIllustrations]);

  // Le document n'est monté qu'avec ses illustrations : PDFDownloadLink le génère dès le montage.
  if (illustrations === null) {
    return (
      <button type="button" className={CLASSES_BOUTON} disabled>
        Préparation du PDF...
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        <VulnerabilitePdfDocument
          synthese={synthese}
          sections={sections}
          illustrations={illustrations}
          eligibleFonds={eligibleFonds}
        />
      }
      fileName="fonds-prevention-argile-vulnerabilite-rga.pdf"
      className={CLASSES_BOUTON}
      onClick={() => trackEvent(MATOMO_EVENTS.VULNERABILITE_PDF_DOWNLOAD)}>
      {({ loading }) => (loading ? "Préparation du PDF..." : "Télécharger les solutions en PDF")}
    </PDFDownloadLink>
  );
}
