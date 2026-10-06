/**
 * Classification pure des écarts entre les dossiers d'une démarche DN et la base FPA, pour
 * `analyser-ecarts-dn.ts`. Aucun accès base ni DN ici : tout arrive en paramètre.
 */

import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

export type EtatDn = "en_construction" | "en_instruction" | "accepte" | "refuse" | "sans_suite";

/** Un dossier listé par `demarche.dossiers` : l'API instructeur ne voit que les dossiers déposés. */
export interface DossierDn {
  numero: string;
  etat: EtatDn;
  archive: boolean;
  prerempli: boolean;
  dateTraitement: Date | null;
  parcoursIdAnnote: string | null;
  annotationDouteuse: boolean;
}

/** Un dossier listé par `deletedDossiers` ou `pendingDeletedDossiers`. */
export interface DossierSupprimeDn {
  numero: string;
  raison: string;
  enCorbeille: boolean;
}

export interface PointeurBase {
  numero: string;
  parcoursId: string;
  dsStatus: string | null;
  submittedAt: Date | null;
  processedAt: Date | null;
  lastSyncAt: Date | null;
  parcoursArchive: boolean;
  parcoursComplete: boolean;
  syncEnErreur: boolean;
}

export interface TentativeBase {
  numero: string;
  parcoursId: string;
}

/** Ce que devient, côté `/stats`, un dossier que DN compte comme déposé. */
export type Perimetre =
  | "compte"
  | "pointeur_sans_depot"
  | "registre_doublon"
  | "registre_remplace"
  | "annote_doublon"
  | "annote_pointeur_perdu"
  | "parcours_supprime"
  | "annotation_douteuse"
  | "prerempli_sans_lien"
  | "hors_fpa";

export const LIBELLES_PERIMETRE: Record<Perimetre, string> = {
  compte: "compté par /stats",
  pointeur_sans_depot: "pointeur courant, mais dépôt jamais enregistré en base",
  registre_doublon: "registre seul, le parcours a un autre dossier déposé (doublon)",
  registre_remplace: "registre seul, pointeur remplacé par un dossier non déposé",
  annote_doublon: "inconnu en base, lien FPA vers un parcours qui a déjà un dossier déposé",
  annote_pointeur_perdu: "inconnu en base, lien FPA vers un parcours sans dossier déposé",
  parcours_supprime: "lien FPA vers un parcours supprimé",
  annotation_douteuse: "inconnu en base, lien FPA ambigu ou modifié à la main",
  prerempli_sans_lien: "inconnu en base, sans lien FPA, mais prérempli (numéro perdu de notre côté)",
  hors_fpa: "inconnu en base, sans lien FPA ni préremplissage (créé directement dans DN)",
};

export type CauseDivergence =
  | "parcours_archive"
  | "parcours_complete"
  | "sync_en_erreur"
  | "sync_ancienne"
  | "etat_inconnu_en_base"
  | "non_explique";

export const LIBELLES_CAUSE: Record<CauseDivergence, string> = {
  parcours_archive: "parcours archivé (hors du CRON)",
  parcours_complete: "parcours complété (hors du CRON)",
  sync_en_erreur: "dernière synchro en erreur",
  sync_ancienne: "aucune synchro depuis plus de 48 h",
  etat_inconnu_en_base: "état DN absent de l'enum ds_status",
  non_explique: "non expliqué",
};

export type CauseFantome = "supprime_dn" | "corbeille_dn" | "introuvable";

export interface Divergence {
  numero: string;
  etatDn: EtatDn;
  dsStatus: string | null;
  cause: CauseDivergence;
}

export interface DateDivergente {
  numero: string;
  dateTraitementDn: Date;
  processedAt: Date | null;
}

export interface Fantome {
  numero: string;
  dsStatus: string | null;
  cause: CauseFantome;
  raison: string | null;
}

/** Pourquoi un dossier accepté dans DN manque au graphique des validés de `/stats`. */
export type AbsenceValide = "decision_mois_en_cours" | "decision_hors_periode" | "etat_divergent" | "hors_perimetre";

export const LIBELLES_ABSENCE_VALIDE: Record<AbsenceValide, string> = {
  decision_mois_en_cours: "décision du mois en cours (le graphique s'arrête au mois précédent)",
  decision_hors_periode: "date de décision absente ou antérieure au lancement",
  etat_divergent: "pas encore « accepté » en base",
  hors_perimetre: "aucun pointeur courant sur ce numéro",
};

export interface RapportEcarts {
  dn: { total: number; archives: number; parEtat: Record<EtatDn, number> };
  base: { deposes: number; valides: number; acceptes: number };
  deposes: {
    parPerimetre: Record<Perimetre, string[]>;
    fantomes: Fantome[];
    /** Doit valoir 0 : DN = base − fantômes + non comptés. Sinon, un cas échappe au classement. */
    residu: number;
  };
  valides: {
    acceptesDn: number;
    absents: Record<AbsenceValide, string[]>;
    /** Comptés dans le graphique alors que DN ne les dit pas acceptés (ou ne les liste plus). */
    enTrop: string[];
    residu: number;
  };
  divergences: Divergence[];
  datesDivergentes: DateDivergente[];
}

const ETATS_DN: EtatDn[] = ["en_construction", "en_instruction", "accepte", "refuse", "sans_suite"];
const SYNC_ANCIENNE_MS = 48 * 3600 * 1000;
const TOLERANCE_DATE_MS = 24 * 3600 * 1000;

/** DN dit `sans_suite`, la base `classe_sans_suite` : seul état dont le libellé diffère. */
export function etatDnVersDsStatus(etat: EtatDn): DSStatus {
  return etat === "sans_suite" ? DSStatus.CLASSE_SANS_SUITE : (etat as DSStatus);
}

/** Bornes du graphique des validés de `/stats` : du lancement au dernier jour du mois précédent (UTC). */
export function fenetreValides(maintenant: Date, debutService: Date): { debut: Date; fin: Date } {
  return { debut: debutService, fin: new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1)) };
}

function estDansFenetre(date: Date | null, fenetre: { debut: Date; fin: Date }): boolean {
  return !!date && date >= fenetre.debut && date < fenetre.fin;
}

export function classerPerimetre(
  dossier: DossierDn,
  pointeurs: Map<string, PointeurBase>,
  pointeurParParcours: Map<string, PointeurBase>,
  tentatives: Map<string, TentativeBase>,
  parcoursExistants: Set<string>
): Perimetre {
  const pointeur = pointeurs.get(dossier.numero);
  if (pointeur) return pointeur.submittedAt ? "compte" : "pointeur_sans_depot";

  const tentative = tentatives.get(dossier.numero);
  if (tentative) {
    return pointeurParParcours.get(tentative.parcoursId)?.submittedAt ? "registre_doublon" : "registre_remplace";
  }

  if (dossier.annotationDouteuse) return "annotation_douteuse";
  if (!dossier.parcoursIdAnnote) return dossier.prerempli ? "prerempli_sans_lien" : "hors_fpa";
  if (!parcoursExistants.has(dossier.parcoursIdAnnote)) return "parcours_supprime";
  return pointeurParParcours.get(dossier.parcoursIdAnnote)?.submittedAt ? "annote_doublon" : "annote_pointeur_perdu";
}

export function causeDivergence(pointeur: PointeurBase, etatDn: EtatDn, maintenant: Date): CauseDivergence {
  if (pointeur.parcoursArchive) return "parcours_archive";
  if (pointeur.parcoursComplete) return "parcours_complete";
  if (etatDn === "sans_suite") return "etat_inconnu_en_base";
  if (pointeur.syncEnErreur) return "sync_en_erreur";
  if (!pointeur.lastSyncAt || maintenant.getTime() - pointeur.lastSyncAt.getTime() > SYNC_ANCIENNE_MS) {
    return "sync_ancienne";
  }
  return "non_explique";
}

function vide<K extends string>(cles: readonly K[]): Record<K, string[]> {
  return Object.fromEntries(cles.map((c) => [c, [] as string[]])) as Record<K, string[]>;
}

export function analyserEcarts(params: {
  dn: DossierDn[];
  supprimes: DossierSupprimeDn[];
  pointeurs: PointeurBase[];
  tentatives: TentativeBase[];
  parcoursExistants: Set<string>;
  maintenant: Date;
  debutService: Date;
}): RapportEcarts {
  const { dn, supprimes, pointeurs, tentatives, parcoursExistants, maintenant, debutService } = params;
  const fenetre = fenetreValides(maintenant, debutService);

  const pointeurParNumero = new Map(pointeurs.map((p) => [p.numero, p]));
  const pointeurParParcours = new Map(pointeurs.map((p) => [p.parcoursId, p]));
  // Un numéro encore pointé n'est pas « registre seul », même s'il figure au registre.
  const tentativeParNumero = new Map(
    tentatives.filter((t) => !pointeurParNumero.has(t.numero)).map((t) => [t.numero, t])
  );
  const dnParNumero = new Map(dn.map((d) => [d.numero, d]));
  const supprimeParNumero = new Map(supprimes.map((s) => [s.numero, s]));

  const parEtat = Object.fromEntries(ETATS_DN.map((e) => [e, 0])) as Record<EtatDn, number>;
  const parPerimetre = vide(Object.keys(LIBELLES_PERIMETRE) as Perimetre[]);
  const absents = vide(Object.keys(LIBELLES_ABSENCE_VALIDE) as AbsenceValide[]);
  const divergences: Divergence[] = [];
  const datesDivergentes: DateDivergente[] = [];

  for (const dossier of dn) {
    parEtat[dossier.etat] += 1;
    const perimetre = classerPerimetre(
      dossier,
      pointeurParNumero,
      pointeurParParcours,
      tentativeParNumero,
      parcoursExistants
    );
    parPerimetre[perimetre].push(dossier.numero);

    const pointeur = pointeurParNumero.get(dossier.numero);
    const etatAttendu = etatDnVersDsStatus(dossier.etat);

    if (pointeur && pointeur.dsStatus !== etatAttendu) {
      divergences.push({
        numero: dossier.numero,
        etatDn: dossier.etat,
        dsStatus: pointeur.dsStatus,
        cause: causeDivergence(pointeur, dossier.etat, maintenant),
      });
    } else if (
      pointeur &&
      dossier.dateTraitement &&
      (!pointeur.processedAt ||
        Math.abs(pointeur.processedAt.getTime() - dossier.dateTraitement.getTime()) > TOLERANCE_DATE_MS)
    ) {
      datesDivergentes.push({
        numero: dossier.numero,
        dateTraitementDn: dossier.dateTraitement,
        processedAt: pointeur.processedAt,
      });
    }

    if (dossier.etat !== "accepte") continue;
    if (!pointeur) absents.hors_perimetre.push(dossier.numero);
    else if (pointeur.dsStatus !== DSStatus.ACCEPTE) absents.etat_divergent.push(dossier.numero);
    else if (estDansFenetre(pointeur.processedAt, fenetre)) continue;
    else if (pointeur.processedAt && pointeur.processedAt >= fenetre.fin) {
      absents.decision_mois_en_cours.push(dossier.numero);
    } else absents.decision_hors_periode.push(dossier.numero);
  }

  const comptes = pointeurs.filter((p) => p.submittedAt);
  const fantomes: Fantome[] = comptes
    .filter((p) => !dnParNumero.has(p.numero))
    .map((p) => {
      const supprime = supprimeParNumero.get(p.numero);
      return {
        numero: p.numero,
        dsStatus: p.dsStatus,
        cause: supprime ? (supprime.enCorbeille ? "corbeille_dn" : "supprime_dn") : "introuvable",
        raison: supprime?.raison ?? null,
      };
    });

  const valides = pointeurs.filter((p) => p.dsStatus === DSStatus.ACCEPTE && estDansFenetre(p.processedAt, fenetre));
  const enTrop = valides.filter((p) => dnParNumero.get(p.numero)?.etat !== "accepte").map((p) => p.numero);

  const nonComptes = dn.length - parPerimetre.compte.length;
  const absentsTotal = Object.values(absents).reduce((s, l) => s + l.length, 0);

  return {
    dn: { total: dn.length, archives: dn.filter((d) => d.archive).length, parEtat },
    base: {
      deposes: comptes.length,
      valides: valides.length,
      acceptes: pointeurs.filter((p) => p.dsStatus === DSStatus.ACCEPTE).length,
    },
    deposes: {
      parPerimetre,
      fantomes,
      residu: dn.length - (comptes.length - fantomes.length + nonComptes),
    },
    valides: {
      acceptesDn: parEtat.accepte,
      absents,
      enTrop,
      residu: parEtat.accepte - (valides.length - enTrop.length + absentsTotal),
    },
    divergences,
    datesDivergentes,
  };
}
