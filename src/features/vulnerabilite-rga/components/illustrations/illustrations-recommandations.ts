import type { StaticImageData } from "next/image";
import schemaPenteTerrain from "./SchemaPenteTerrain.svg";
import schemaReseauxEnterres from "./SchemaReseauxEnterres.svg";
import schemaGravierProprete from "./SchemaGravierProprete.svg";
import schemaGouttieres from "./SchemaGouttieres.svg";
import schemaRecuperateurEau from "./SchemaRecuperateurEau.svg";
import schemaArbreProximite from "./SchemaArbreProximite.svg";
import schemaHaies from "./SchemaHaies.svg";
import schemaVegetationPiedFacade from "./SchemaVegetationPiedFacade.svg";
import schemaEnsoleillement from "./SchemaEnsoleillement.svg";
import schemaSourceChaleurSousSol from "./SchemaSourceChaleurSousSol.svg";

/** Illustrations des fiches, par `illustrationId` du catalogue : partagées entre l'écran et le PDF. */
export const ILLUSTRATIONS_RECOMMANDATIONS: Record<string, StaticImageData> = {
  pente: schemaPenteTerrain,
  reseaux: schemaReseauxEnterres,
  gravier: schemaGravierProprete,
  gouttieres: schemaGouttieres,
  "recuperateur-eau": schemaRecuperateurEau,
  arbre: schemaArbreProximite,
  haies: schemaHaies,
  "pied-facade": schemaVegetationPiedFacade,
  ensoleillement: schemaEnsoleillement,
  "source-chaleur": schemaSourceChaleurSousSol,
};
