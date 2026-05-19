import { allersVersRepository, entreprisesAmoRepo } from "@/shared/database";
import { getResponsableDossier, type Responsable } from "@/features/parcours/core/domain/services/responsable.service";
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
