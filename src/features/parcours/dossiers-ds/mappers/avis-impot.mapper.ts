import type {
  ChampAvisImpotDn,
  ColonneDn,
  DossierAvisImpot,
  IntegerNumberChampDn,
  PieceJustificativeChampDn,
  RepetitionChampDn,
} from "../adapters/graphql/types";
import type { AvisImpotExtrait, DonneesAvisImpotDossier } from "../domain/avis-impot";
import { DS_FIELD_IDS } from "../domain/value-objects/ds-field-ids";

export const NATURE_AVIS_IMPOT = "AVIS_IMPOT";

// Attributs posés par DN (`OCRService.extract_avis_impot`), lus dans l'id de la colonne.
const ATTRIBUTS_AVIS = {
  DECLARANT_1: "declarant_1",
  DECLARANT_2: "declarant_2",
  REFERENCE_AVIS: "reference_avis",
  ANNEE_REVENUS: "annee_des_revenus",
  NOMBRE_PARTS: "nombre_de_parts",
  REVENU_FISCAL_REFERENCE: "revenu_fiscal_de_reference",
  DATE_MISE_EN_RECOUVREMENT: "date_mise_en_recouvrement",
} as const;

// Adresse du foyer fiscal, géocodée par DN : sans usage pour le contrôle.
const ATTRIBUTS_IGNORES = new Set(["postal_code", "city_name", "department_code", "region_code"]);

const ATTRIBUTS_CONNUS = new Set<string>(Object.values(ATTRIBUTS_AVIS));

/**
 * L'id d'une colonne est le base64 de `Column-type_de_champ/<stable_id>-$.<attribut>`, plus stable
 * que son libellé traduit. La colonne des fichiers n'a pas d'attribut.
 */
export function attributDeColonne(id: string): string | null {
  let decode: string;
  try {
    decode = atob(id);
  } catch {
    return null;
  }
  return decode.match(/-\$\.([a-z0-9_.]+)$/)?.[1] ?? null;
}

function versNombre(valeur: string | number | null | undefined): number | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const nombre = typeof valeur === "number" ? valeur : Number(String(valeur).replace(",", "."));
  return Number.isFinite(nombre) ? nombre : null;
}

function versTexte(valeur: string | null | undefined): string | null {
  const texte = valeur?.trim();
  return texte ? texte : null;
}

function estPiece(champ: ChampAvisImpotDn): champ is PieceJustificativeChampDn {
  return champ.__typename === "PieceJustificativeChamp";
}

function estRepetition(champ: ChampAvisImpotDn): champ is RepetitionChampDn {
  return champ.__typename === "RepetitionChamp";
}

function estEntier(champ: ChampAvisImpotDn): champ is IntegerNumberChampDn {
  return champ.__typename === "IntegerNumberChamp";
}

function extraireAvis(piece: PieceJustificativeChampDn, dansRepetition: boolean): AvisImpotExtrait {
  const parAttribut = new Map<string, ColonneDn>();
  const attributsInconnus: string[] = [];

  for (const colonne of piece.columns) {
    const attribut = attributDeColonne(colonne.id);
    if (!attribut || ATTRIBUTS_IGNORES.has(attribut)) continue;
    if (ATTRIBUTS_CONNUS.has(attribut)) parAttribut.set(attribut, colonne);
    else attributsInconnus.push(attribut);
  }

  const texte = (attribut: string) => versTexte(parAttribut.get(attribut)?.stringValue);
  const entier = (attribut: string) => {
    const colonne = parAttribut.get(attribut);
    return versNombre(colonne?.valeurEntiere ?? colonne?.stringValue);
  };
  const decimal = (attribut: string) => {
    const colonne = parAttribut.get(attribut);
    return versNombre(colonne?.valeurDecimale ?? colonne?.stringValue);
  };

  const avis = {
    declarant1: texte(ATTRIBUTS_AVIS.DECLARANT_1),
    declarant2: texte(ATTRIBUTS_AVIS.DECLARANT_2),
    referenceAvis: texte(ATTRIBUTS_AVIS.REFERENCE_AVIS),
    anneeRevenus: entier(ATTRIBUTS_AVIS.ANNEE_REVENUS),
    nombreParts: decimal(ATTRIBUTS_AVIS.NOMBRE_PARTS),
    revenuFiscalReference: entier(ATTRIBUTS_AVIS.REVENU_FISCAL_REFERENCE),
    dateMiseEnRecouvrement:
      versTexte(parAttribut.get(ATTRIBUTS_AVIS.DATE_MISE_EN_RECOUVREMENT)?.valeurDate) ??
      texte(ATTRIBUTS_AVIS.DATE_MISE_EN_RECOUVREMENT),
  };

  return {
    champDescriptorId: piece.champDescriptorId,
    libelleChamp: piece.label,
    dansRepetition,
    nombreFichiers: piece.files.length,
    lu: Object.values(avis).some((valeur) => valeur !== null),
    ...avis,
    attributsInconnus,
  };
}

/** Repère les avis par leur nature, ce qui couvre le champ simple comme le bloc répété. */
export function mapDossierAvisImpot(dossier: DossierAvisImpot): DonneesAvisImpotDossier {
  const avis: AvisImpotExtrait[] = [];
  const entiers = new Map<string, number | null>();

  for (const champ of dossier.champs) {
    if (estPiece(champ) && champ.nature === NATURE_AVIS_IMPOT) avis.push(extraireAvis(champ, false));
    if (estEntier(champ)) entiers.set(champ.champDescriptorId, versNombre(champ.valeurEntiere));
    if (estRepetition(champ)) {
      for (const ligne of champ.rows) {
        for (const sousChamp of ligne.champs) {
          if (estPiece(sousChamp) && sousChamp.nature === NATURE_AVIS_IMPOT) avis.push(extraireAvis(sousChamp, true));
        }
      }
    }
  }

  return {
    dossierId: dossier.id,
    numero: dossier.number,
    etat: dossier.state,
    demarcheNumero: dossier.demarche?.number ?? null,
    dateDepot: dossier.dateDepot ?? null,
    champsModifiesAt: dossier.dateDerniereModificationChamps ?? null,
    declaratif: {
      nombrePersonnes: entiers.get(DS_FIELD_IDS.ELIGIBILITE.NOMBRE_PERSONNES) ?? null,
      revenuFiscalReference: entiers.get(DS_FIELD_IDS.ELIGIBILITE.REVENU_FISCAL_REFERENCE) ?? null,
    },
    avis,
    annotations: Object.fromEntries(
      (dossier.annotations ?? []).map((a) => [a.champDescriptorId, a.stringValue ?? null])
    ),
  };
}
