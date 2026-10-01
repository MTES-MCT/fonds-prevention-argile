import type {
  ChampAvisImpotDn,
  ColonneDn,
  DossierAvisImpot,
  PieceJustificativeChampDn,
} from "../adapters/graphql/types";
import { DS_FIELD_IDS } from "../domain/value-objects/ds-field-ids";

// Réponses DN fictives, calquées sur un dossier de préprod réel (forme, ids, types de colonnes).

const STABLE_ID_DERNIER_AVIS = 5542794;
const STABLE_ID_AVIS_REPETE = 7014825;
const MIS_A_JOUR = "2026-09-29T15:41:02+02:00";

export interface ValeursAvisFictif {
  declarant1: string;
  declarant2?: string;
  referenceAvis: string;
  anneeRevenus: number;
  nombreParts: number;
  revenuFiscalReference: number;
  dateMiseEnRecouvrement: string;
}

function idColonne(stableId: number, attribut?: string): string {
  return btoa(attribut ? `Column-type_de_champ/${stableId}-$.${attribut}` : `Column-type_de_champ/${stableId}`);
}

function colonnes(stableId: number, libelle: string, valeurs: ValeursAvisFictif | null): ColonneDn[] {
  const colonne = (
    __typename: string,
    attribut: string,
    suffixe: string,
    stringValue: string | null,
    typee: Partial<ColonneDn> = {}
  ): ColonneDn => ({
    __typename,
    id: idColonne(stableId, attribut),
    label: `${libelle} – ${suffixe}`,
    stringValue,
    ...typee,
  });
  const v = valeurs;
  return [
    { __typename: "AttachmentsColumn", id: idColonne(stableId), label: libelle, stringValue: "avis.pdf" },
    colonne("TextColumn", "declarant_1", "Déclarant 1", v?.declarant1 ?? null),
    colonne("TextColumn", "declarant_2", "Déclarant 2", v?.declarant2 ?? null),
    colonne("TextColumn", "reference_avis", "Référence de l’avis", v?.referenceAvis ?? null),
    colonne("IntegerColumn", "annee_des_revenus", "Année des revenus", v ? String(v.anneeRevenus) : null, {
      valeurEntiere: v ? String(v.anneeRevenus) : null,
    }),
    colonne("DecimalColumn", "nombre_de_parts", "Nombre de parts", v ? String(v.nombreParts) : null, {
      valeurDecimale: v?.nombreParts ?? null,
    }),
    colonne(
      "IntegerColumn",
      "revenu_fiscal_de_reference",
      "Revenu fiscal de référence",
      v ? String(v.revenuFiscalReference) : null,
      { valeurEntiere: v ? String(v.revenuFiscalReference) : null }
    ),
    colonne(
      "DateColumn",
      "date_mise_en_recouvrement",
      "Date de mise en recouvrement",
      v?.dateMiseEnRecouvrement ?? null,
      { valeurDate: v?.dateMiseEnRecouvrement ?? null }
    ),
    colonne("TextColumn", "postal_code", "Code postal (5 chiffres)", null),
    colonne("TextColumn", "city_name", "Commune", null),
    colonne("EnumColumn", "department_code", "Département", null),
    colonne("EnumColumn", "region_code", "Région", null),
  ];
}

/** Pièce avis d'imposition : `valeurs` null simule un 2D-Doc absent ou illisible. */
export function pieceAvisFictive(
  valeurs: ValeursAvisFictif | null,
  options: { repetee?: boolean; sansFichier?: boolean } = {}
): PieceJustificativeChampDn {
  const stableId = options.repetee ? STABLE_ID_AVIS_REPETE : STABLE_ID_DERNIER_AVIS;
  const libelle = options.repetee ? "Avis d'imposition" : "Dernier avis d'imposition";
  return {
    __typename: "PieceJustificativeChamp",
    champDescriptorId: btoa(`Champ-${stableId}`),
    label: libelle,
    updatedAt: MIS_A_JOUR,
    nature: "AVIS_IMPOT",
    files: options.sansFichier ? [] : [{ contentType: "application/pdf" }],
    columns: options.sansFichier ? [] : colonnes(stableId, libelle, valeurs),
  };
}

export function dossierAvisFictif(options: {
  nombrePersonnes: number | null;
  revenuFiscalReference: number | null;
  /** Département de la commune du logement : 32 (Gers, hors IdF) par défaut, null sans commune. */
  codeDepartement?: string | null;
  dernierAvis?: PieceJustificativeChampDn;
  avisRepetes?: PieceJustificativeChampDn[];
}): DossierAvisImpot {
  const entier = (id: string, label: string, valeur: number | null): ChampAvisImpotDn => ({
    __typename: "IntegerNumberChamp",
    champDescriptorId: id,
    label,
    updatedAt: MIS_A_JOUR,
    valeurEntiere: valeur === null ? null : String(valeur),
  });
  const champs: ChampAvisImpotDn[] = [
    entier(
      DS_FIELD_IDS.ELIGIBILITE.NOMBRE_PERSONNES,
      "Nombre de personnes composant le ménage",
      options.nombrePersonnes
    ),
    entier(
      DS_FIELD_IDS.ELIGIBILITE.REVENU_FISCAL_REFERENCE,
      "Revenu fiscal de référence",
      options.revenuFiscalReference
    ),
    {
      __typename: "CommuneChamp",
      champDescriptorId: DS_FIELD_IDS.ELIGIBILITE.COMMUNE,
      label: "Commune",
      updatedAt: MIS_A_JOUR,
      departement: options.codeDepartement === null ? null : { code: options.codeDepartement ?? "32" },
    },
    {
      __typename: "RepetitionChamp",
      champDescriptorId: "Q2hhbXAtNzAxNDgyNA==",
      label: "Tous les Avis d'imposition du foyer",
      updatedAt: MIS_A_JOUR,
      rows: (options.avisRepetes ?? []).map((piece) => ({ champs: [piece] })),
    },
  ];
  if (options.dernierAvis) champs.push(options.dernierAvis);
  // Pièce d'une autre nature : ne doit jamais être prise pour un avis.
  champs.push({ ...pieceAvisFictive(null, { sansFichier: true }), nature: "RIB", label: "RIB" });

  return {
    id: "RG9zc2llci0x",
    number: 1,
    state: "en_construction",
    dateDepot: "2026-09-29T15:41:02+02:00",
    dateDerniereModification: MIS_A_JOUR,
    dateDerniereModificationChamps: MIS_A_JOUR,
    demarche: { number: 146377 },
    champs,
    annotations: [{ champDescriptorId: "Q2hhbXAtNzAyMDIwNw==", stringValue: null }],
  };
}

const FOYER_MARTIN: ValeursAvisFictif = {
  declarant1: "MARTIN CLAIRE",
  declarant2: "MARTIN PAUL",
  referenceAvis: "2600A00000001",
  anneeRevenus: 2025,
  nombreParts: 2.5,
  revenuFiscalReference: 18500,
  dateMiseEnRecouvrement: "2026-07-31",
};

const FOYER_DURAND: ValeursAvisFictif = {
  declarant1: "DURAND LOUIS",
  referenceAvis: "2600A00000002",
  anneeRevenus: 2025,
  nombreParts: 1,
  revenuFiscalReference: 9200,
  dateMiseEnRecouvrement: "2026-07-31",
};

/** Scénarios nommés, partagés par les tests et `pnpm ds:inspecter-avis-impot --fixture=<nom>`. */
export const FIXTURES_AVIS_IMPOT = {
  lu: dossierAvisFictif({
    nombrePersonnes: 3,
    revenuFiscalReference: 18500,
    dernierAvis: pieceAvisFictive(FOYER_MARTIN),
  }),
  doublon: dossierAvisFictif({
    nombrePersonnes: 3,
    revenuFiscalReference: 18500,
    dernierAvis: pieceAvisFictive(FOYER_MARTIN),
    avisRepetes: [pieceAvisFictive(FOYER_MARTIN, { repetee: true })],
  }),
  "deux-foyers": dossierAvisFictif({
    nombrePersonnes: 4,
    revenuFiscalReference: 27700,
    avisRepetes: [pieceAvisFictive(FOYER_MARTIN, { repetee: true }), pieceAvisFictive(FOYER_DURAND, { repetee: true })],
  }),
  "ecart-revenu": dossierAvisFictif({
    nombrePersonnes: 3,
    revenuFiscalReference: 30000,
    dernierAvis: pieceAvisFictive({ ...FOYER_MARTIN, revenuFiscalReference: 35000 }),
  }),
  "non-lu": dossierAvisFictif({
    nombrePersonnes: 2,
    revenuFiscalReference: 15000,
    dernierAvis: pieceAvisFictive(null),
  }),
  "sans-avis": dossierAvisFictif({
    nombrePersonnes: 2,
    revenuFiscalReference: 15000,
    dernierAvis: pieceAvisFictive(null, { sansFichier: true }),
  }),
} satisfies Record<string, DossierAvisImpot>;

export type NomFixtureAvisImpot = keyof typeof FIXTURES_AVIS_IMPOT;
