"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { VulnerabilitePdfDocument } from "./VulnerabilitePdfDocument";
import { useMatomo } from "@/shared/components/Matomo/useMatomo";
import { MATOMO_EVENTS } from "@/shared/constants";
import type { SectionRecommandations } from "../../domain/services/recommandations.service";
import type { SyntheseResultat } from "../../domain/services/synthese-resultat.service";

interface TelechargerPdfButtonProps {
  synthese: SyntheseResultat;
  sections: SectionRecommandations[];
}

/**
 * Isolé dans son propre module pour être chargé en `next/dynamic` depuis l'écran de
 * résultat : c'est le seul point d'entrée vers `@react-pdf/renderer` (~256 Ko gzip).
 */
export function TelechargerPdfButton({ synthese, sections }: TelechargerPdfButtonProps) {
  const { trackEvent } = useMatomo();

  return (
    // toBlob() démarre au montage (comportement PDFDownloadLink) : coût unique et
    // négligeable pour un document texte, contre un clic instantané pour l'usager.
    <PDFDownloadLink
      document={<VulnerabilitePdfDocument synthese={synthese} sections={sections} />}
      fileName="fonds-prevention-argile-vulnerabilite-rga.pdf"
      className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center fr-mb-2w md:fr-mb-0 md:fr-mr-2w"
      onClick={() => trackEvent(MATOMO_EVENTS.VULNERABILITE_PDF_DOWNLOAD)}>
      {({ loading }) => (loading ? "Préparation du PDF..." : "Télécharger les solutions en PDF")}
    </PDFDownloadLink>
  );
}
