import { eq } from "drizzle-orm";
import { allersVersRepository, db, entreprisesAmoRepo, parcoursRepo } from "@/shared/database";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { getResponsableDossier, type Responsable } from "@/features/parcours/core/domain/services/responsable.service";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import type { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { Status } from "@/shared/domain/value-objects/status.enum";

/**
 * Données minimales d'un dossier pour résoudre son responsable.
 */
export interface ResolverDossier {
  parcoursId: string;
  archivedAt: Date | null;
  currentStatus: Status;
  codeDepartement: string | null;
  validation: {
    statut: StatutValidationAmo;
    entrepriseAmoId: string | null;
  } | null;
}

/**
 * Résout en batch le responsable de plusieurs dossiers :
 *  - récupère en une fois les noms des entreprises AMO citées,
 *  - récupère en une fois les Aller-vers couvrant les départements présents.
 */
export async function resolveResponsables(
  dossiers: ResolverDossier[]
): Promise<Map<string, Responsable>> {
  const amoIds = unique(dossiers.map((d) => d.validation?.entrepriseAmoId ?? null));
  const codesDept = unique(dossiers.map((d) => d.codeDepartement));

  const [amosMap, avParDept] = await Promise.all([loadAmoMap(amoIds), loadAvParDepartement(codesDept)]);

  const result = new Map<string, Responsable>();
  for (const d of dossiers) {
    const entreprise =
      d.validation && d.validation.entrepriseAmoId
        ? amosMap.get(d.validation.entrepriseAmoId) ?? null
        : null;

    const responsable = getResponsableDossier({
      currentStatus: d.currentStatus,
      archivedAt: d.archivedAt,
      validation: d.validation
        ? { statut: d.validation.statut, entreprise }
        : null,
      codeDepartement: d.codeDepartement,
      allersVersTerritorial: d.codeDepartement ? avParDept.get(d.codeDepartement) ?? null : null,
    });
    result.set(d.parcoursId, responsable);
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

  const map = await resolveResponsables([
    {
      parcoursId,
      archivedAt: parcours.archivedAt,
      currentStatus: parcours.currentStatus,
      codeDepartement,
      validation: validation
        ? { statut: validation.statut, entrepriseAmoId: validation.entrepriseAmoId }
        : null,
    },
  ]);

  return map.get(parcoursId) ?? null;
}

function unique<T>(values: (T | null)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v !== null)));
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

async function loadAvParDepartement(
  depts: string[]
): Promise<Map<string, { id: string; nom: string }>> {
  if (depts.length === 0) return new Map();
  const lists = await Promise.all(depts.map((d) => allersVersRepository.findByDepartement(d)));
  const map = new Map<string, { id: string; nom: string }>();
  depts.forEach((dept, idx) => {
    const first = lists[idx][0];
    if (first) map.set(dept, { id: first.id, nom: first.nom });
  });
  return map;
}
