import { ILLUSTRATIONS_RECOMMANDATIONS } from "../illustrations/illustrations-recommandations";
import type { SectionRecommandations } from "../../domain/services/recommandations.service";

/** PNG (data URL) par `illustrationId` : @react-pdf/renderer n'accepte ni SVG ni WebP. */
export type IllustrationsPdf = Record<string, string>;

// Rendu au double de la taille native, pour rester net à l'impression.
const ECHELLE = 2;

export function getIllustrationIds(sections: SectionRecommandations[]): string[] {
  const ids = sections.flatMap((s) => s.recommandations.map((r) => r.illustrationId));
  return [...new Set(ids.filter((id): id is string => id !== undefined && id in ILLUSTRATIONS_RECOMMANDATIONS))];
}

function rasteriser(src: string, largeur: number, hauteur: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = largeur * ECHELLE;
      canvas.height = hauteur * ECHELLE;
      const contexte = canvas.getContext("2d");
      if (!contexte) return reject(new Error("Canvas 2D indisponible"));
      contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error(`Illustration illisible : ${src}`));
    image.src = src;
  });
}

/** Une illustration en échec est omise : le PDF reste téléchargeable, sans elle. */
export async function rasteriserIllustrations(ids: string[]): Promise<IllustrationsPdf> {
  const resultats = await Promise.allSettled(
    ids.map(async (id) => {
      const { src, width, height } = ILLUSTRATIONS_RECOMMANDATIONS[id];
      return [id, await rasteriser(src, width, height)] as const;
    })
  );
  return Object.fromEntries(resultats.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])));
}
