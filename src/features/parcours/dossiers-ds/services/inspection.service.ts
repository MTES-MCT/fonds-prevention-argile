import { eq, or, sql } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursPrevention, users } from "@/shared/database/schema";
import { graphqlClient } from "../adapters/graphql/client";
import type { DossierInspection } from "../adapters/graphql/types";

/**
 * Aide à identifier le demandeur d'un dossier DN qu'aucun parcours ne suit (ADR-0027).
 *
 * Ne rattache rien : rapproche. Les critères ci-dessous sont des indices, pas des preuves —
 * une adresse e-mail peut être celle de l'AMO, un nom peut être porté par deux personnes. La
 * décision reste humaine, l'écran ne fait que lui épargner l'enquête.
 */

/** Ce qui a fait correspondre un demandeur, du plus fiable au moins fiable. */
export type MotifRapprochement = "adresse_logement" | "telephone" | "email" | "nom_prenom";

export const MOTIF_LABELS: Record<MotifRapprochement, string> = {
  adresse_logement: "même adresse de logement",
  telephone: "même téléphone",
  email: "même adresse e-mail",
  nom_prenom: "mêmes nom et prénom",
};

export interface CandidatDemandeur {
  parcoursId: string;
  userId: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  currentStep: string;
  adresse: string | null;
  motifs: MotifRapprochement[];
}

export interface InspectionDossier {
  dn: {
    number: number;
    state: string;
    dateDepot?: string;
    emailUsager: string | null;
    nomDeclare: string | null;
    prenomDeclare: string | null;
    deposeParUnTiers: boolean;
    mandataire: string | null;
    /** Champs du formulaire non vides, tels que DN les renvoie. */
    champs: Array<{ label: string; valeur: string }>;
  };
  candidats: CandidatDemandeur[];
}

/** Derniers chiffres d'un numéro, pour comparer des formats de saisie hétérogènes. */
function chiffresSignificatifs(telephone: string | null | undefined): string | null {
  const chiffres = telephone?.replace(/\D/g, "") ?? "";
  return chiffres.length >= 9 ? chiffres.slice(-9) : null;
}

/** Repère un champ par son libellé : les ids de champ diffèrent d'une démarche à l'autre. */
function champParLibelle(dn: DossierInspection, motif: RegExp): string | null {
  const champ = dn.champs?.find((c) => motif.test(c.label) && c.stringValue?.trim());
  return champ?.stringValue?.trim() ?? null;
}

export async function inspecterDossierDn(dsNumber: string): Promise<InspectionDossier | null> {
  const dn = await graphqlClient.getDossierPourInspection(Number(dsNumber));
  if (!dn) return null;

  const emailUsager = dn.usager?.email?.toLowerCase().trim() ?? null;
  const nomDeclare = dn.demandeur?.nom?.trim() ?? null;
  const prenomDeclare = dn.demandeur?.prenom?.trim() ?? null;
  const telephone = champParLibelle(dn, /t[ée]l[ée]phone/i);
  const adresse = champParLibelle(dn, /adresse postale de la maison/i);
  const telephoneCourt = chiffresSignificatifs(telephone);

  const conditions = [];
  if (emailUsager) {
    conditions.push(sql`lower(${users.email}) = ${emailUsager}`);
    conditions.push(sql`lower(${users.emailContact}) = ${emailUsager}`);
  }
  if (telephoneCourt) {
    conditions.push(sql`regexp_replace(coalesce(${users.telephone}, ''), '\\D', '', 'g') LIKE ${"%" + telephoneCourt}`);
  }
  if (nomDeclare && prenomDeclare) {
    conditions.push(
      sql`lower(${users.nom}) = ${nomDeclare.toLowerCase()} AND lower(${users.prenom}) = ${prenomDeclare.toLowerCase()}`
    );
  }
  if (adresse) {
    conditions.push(
      sql`coalesce(${parcoursPrevention.rgaSimulationData}, ${parcoursPrevention.rgaSimulationDataAgent})->'logement'->>'adresse' ILIKE ${adresse}`
    );
  }

  const champs = (dn.champs ?? [])
    .filter((c) => c.stringValue?.trim())
    .map((c) => ({ label: c.label, valeur: c.stringValue!.trim() }));

  const infosDn: InspectionDossier["dn"] = {
    number: dn.number,
    state: dn.state,
    dateDepot: dn.dateDepot,
    emailUsager,
    nomDeclare,
    prenomDeclare,
    deposeParUnTiers: !!dn.deposeParUnTiers,
    mandataire: [dn.prenomMandataire, dn.nomMandataire].filter(Boolean).join(" ").trim() || null,
    champs,
  };

  // Aucun critère exploitable : inutile de balayer la table des demandeurs.
  if (conditions.length === 0) return { dn: infosDn, candidats: [] };

  const lignes = await db
    .select({
      parcoursId: parcoursPrevention.id,
      userId: users.id,
      nom: users.nom,
      prenom: users.prenom,
      email: users.email,
      emailContact: users.emailContact,
      telephone: users.telephone,
      currentStep: parcoursPrevention.currentStep,
      adresse: sql<
        string | null
      >`coalesce(${parcoursPrevention.rgaSimulationData}, ${parcoursPrevention.rgaSimulationDataAgent})->'logement'->>'adresse'`,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(or(...conditions))
    .limit(20);

  // Les motifs sont recalculés ici plutôt que dans le SQL : on veut les afficher un par un.
  const candidats: CandidatDemandeur[] = lignes.map((l) => {
    const motifs: MotifRapprochement[] = [];

    if (adresse && l.adresse?.toLowerCase() === adresse.toLowerCase()) motifs.push("adresse_logement");
    if (telephoneCourt && chiffresSignificatifs(l.telephone) === telephoneCourt) motifs.push("telephone");
    if (emailUsager && (l.email?.toLowerCase() === emailUsager || l.emailContact?.toLowerCase() === emailUsager)) {
      motifs.push("email");
    }
    if (
      nomDeclare &&
      prenomDeclare &&
      l.nom?.toLowerCase() === nomDeclare.toLowerCase() &&
      l.prenom?.toLowerCase() === prenomDeclare.toLowerCase()
    ) {
      motifs.push("nom_prenom");
    }

    return {
      parcoursId: l.parcoursId,
      userId: l.userId,
      nom: l.nom,
      prenom: l.prenom,
      email: l.emailContact ?? l.email,
      currentStep: l.currentStep,
      adresse: l.adresse,
      motifs,
    };
  });

  // Le plus de motifs concordants d'abord : c'est le candidat le plus probable.
  candidats.sort((a, b) => b.motifs.length - a.motifs.length);

  return { dn: infosDn, candidats };
}
