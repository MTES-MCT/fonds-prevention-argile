import { z } from "zod";
import { ETAPES_AVIS, LONGUEUR_MAX_COMMENTAIRE, ORIGINES_AVIS, SUJET_SIMULATEUR, estNoteAvis } from "./avis";

const noteSchema = z.number().int().refine(estNoteAvis, "Note hors échelle");

const commentaireSchema = z
  .string()
  .trim()
  .max(LONGUEUR_MAX_COMMENTAIRE)
  .transform((texte) => (texte === "" ? undefined : texte))
  .optional();

const communSchema = z.object({
  note: noteSchema,
  commentaire: commentaireSchema,
  origine: z.enum(ORIGINES_AVIS),
});

const avisEtapeSchema = communSchema.extend({
  sujet: z.enum(ETAPES_AVIS),
  parcoursId: z.uuid(),
});

const avisSimulateurSchema = communSchema.extend({
  sujet: z.literal(SUJET_SIMULATEUR),
  // Présent pour compléter un avis déjà créé dans la même visite.
  avisId: z.uuid().optional(),
  simulationEligible: z.boolean().optional(),
  codeDepartement: z
    .string()
    .regex(/^(\d{2,3}|2[AB])$/)
    .optional(),
});

export const avisPayloadSchema = z.discriminatedUnion("sujet", [avisEtapeSchema, avisSimulateurSchema]);
export type AvisPayload = z.infer<typeof avisPayloadSchema>;

// Paramètres du lien envoyé par mail : /avis?etape=…&note=…&p=…
export const lienAvisSchema = z.object({
  etape: z.enum(ETAPES_AVIS),
  p: z.uuid(),
  // Une note illisible n'invalide pas le lien : le formulaire s'affiche sans présélection.
  note: z.coerce.number().int().refine(estNoteAvis).optional().catch(undefined),
});
