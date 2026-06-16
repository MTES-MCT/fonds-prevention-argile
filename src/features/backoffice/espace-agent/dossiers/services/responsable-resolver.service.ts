import { eq } from "drizzle-orm";
import { allersVersRepository, db, entreprisesAmoRepo, parcoursRepo } from "@/shared/database";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { getResponsableDossier, type Responsable } from "@/features/parcours/core/domain/services/responsable.service";
import { getDossierEtat, type DossierEtat } from "@/features/parcours/core/domain/services/dossier-etat.service";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import type { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { Status } from "@/shared/domain/value-objects/status.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

/**
 * Données minimales d'un dossier pour résoudre son responsable.
 */
export interface ResolverDossier {
  parcoursId: string;
  archivedAt: Date | null;
  currentStatus: Status;
  codeDepartement: string | null;
  /**
   * EPCI du logement — sert à résoudre l'Aller-vers responsable
   * (priorité EPCI, fallback département si aucun AV rattaché à l'EPCI).
   */
  codeEpci: string | null;
  validation: {
    statut: StatutValidationAmo;
    entrepriseAmoId: string | null;
  } | null;
  /** Statut DS du dossier de l'étape courante — affine l'état DDT/ménage (cf. getDossierEtat). */
  dsStatus?: DSStatus | null;
  /** Date de passage en instruction — distingue 1er dépôt et retour de correction. */
  instructedAt?: Date | null;
}

/**
 * Résultat batché : responsable du dossier + état orthogonal.
 * Les deux dimensions sont distinctes (cf. doc dans responsable.service.ts).
 */
export interface ResolvedDossier {
  responsable: Responsable;
  etat: DossierEtat;
}

/**
 * Résout en batch le responsable + l'état de plusieurs dossiers :
 *  - récupère en une fois les noms des entreprises AMO citées,
 *  - récupère en une fois les Aller-vers couvrant les couples (EPCI, département)
 *    présents, avec priorité EPCI et fallback département.
 */
export async function resolveResponsables(dossiers: ResolverDossier[]): Promise<Map<string, ResolvedDossier>> {
  const amoIds = unique(dossiers.map((d) => d.validation?.entrepriseAmoId ?? null));
  const territoires = uniqueTerritoires(dossiers);

  const [amosMap, avParTerritoire] = await Promise.all([loadAmoMap(amoIds), loadAvParTerritoire(territoires)]);

  const result = new Map<string, ResolvedDossier>();
  for (const d of dossiers) {
    const entreprise =
      d.validation && d.validation.entrepriseAmoId ? (amosMap.get(d.validation.entrepriseAmoId) ?? null) : null;

    const responsable = getResponsableDossier({
      validation: d.validation ? { statut: d.validation.statut, entreprise } : null,
      codeDepartement: d.codeDepartement,
      allersVersTerritorial: avParTerritoire.get(territoireKey(d.codeEpci, d.codeDepartement)) ?? null,
    });

    const etat = getDossierEtat({
      currentStatus: d.currentStatus,
      archivedAt: d.archivedAt,
      validation: d.validation ? { statut: d.validation.statut } : null,
      dsStatus: d.dsStatus ?? null,
      instructedAt: d.instructedAt ?? null,
    });

    result.set(d.parcoursId, { responsable, etat });
  }
  return result;
}

/**
 * Résout le responsable d'un parcours unique (utilisé par les server actions
 * qui doivent vérifier l'autorisation avant un archivage ou une qualification).
 * Retourne `null` si le parcours n'existe pas.
 */
export async function resolveResponsableForParcours(parcoursId: string): Promise<Responsable | null> {
  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) return null;

  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  const logement = getDemandeurFirstLogement(parcours);
  const codeDepartement = logement?.code_departement ? String(logement.code_departement) : null;
  const codeEpci = logement?.epci ? String(logement.epci) : null;

  const map = await resolveResponsables([
    {
      parcoursId,
      archivedAt: parcours.archivedAt,
      currentStatus: parcours.currentStatus,
      codeDepartement,
      codeEpci,
      validation: validation ? { statut: validation.statut, entrepriseAmoId: validation.entrepriseAmoId } : null,
    },
  ]);

  return map.get(parcoursId)?.responsable ?? null;
}

function unique<T>(values: (T | null)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v !== null)));
}

/**
 * Clé de cache pour la résolution AV par territoire :
 * un couple (codeEpci, codeDepartement). Les deux peuvent être null/manquants.
 */
function territoireKey(codeEpci: string | null, codeDepartement: string | null): string {
  return `${codeEpci ?? ""}|${codeDepartement ?? ""}`;
}

function uniqueTerritoires(
  dossiers: ResolverDossier[]
): Array<{ codeEpci: string | null; codeDepartement: string | null }> {
  const seen = new Set<string>();
  const list: Array<{ codeEpci: string | null; codeDepartement: string | null }> = [];
  for (const d of dossiers) {
    const key = territoireKey(d.codeEpci, d.codeDepartement);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ codeEpci: d.codeEpci, codeDepartement: d.codeDepartement });
  }
  return list;
}

async function loadAmoMap(ids: string[]): Promise<Map<string, { id: string; nom: string }>> {
  if (ids.length === 0) return new Map();
  const amos = await Promise.all(ids.map((id) => entreprisesAmoRepo.findById(id)));
  const map = new Map<string, { id: string; nom: string }>();
  for (const amo of amos) {
    if (amo) map.set(amo.id, { id: amo.id, nom: amo.nom });
  }
  return map;
}

/**
 * Charge en parallèle l'Aller-vers responsable pour chaque couple (EPCI, dept) unique.
 *
 * Priorité EPCI (un AV rattaché spécifiquement à l'EPCI prend le pas), fallback
 * département (utile pour les départements où aucun AV n'a de rattachement EPCI fin).
 *
 * Si plusieurs AV couvrent le même territoire, on retient le premier (ordre `nom`).
 */
async function loadAvParTerritoire(
  territoires: Array<{ codeEpci: string | null; codeDepartement: string | null }>
): Promise<Map<string, { id: string; nom: string }>> {
  if (territoires.length === 0) return new Map();
  const lists = await Promise.all(
    territoires.map((t) =>
      t.codeDepartement
        ? allersVersRepository.findByEpciWithDepartementFallback(t.codeDepartement, t.codeEpci ?? undefined)
        : Promise.resolve([])
    )
  );
  const map = new Map<string, { id: string; nom: string }>();
  territoires.forEach((t, idx) => {
    const first = lists[idx][0];
    if (first) map.set(territoireKey(t.codeEpci, t.codeDepartement), { id: first.id, nom: first.nom });
  });
  return map;
}
