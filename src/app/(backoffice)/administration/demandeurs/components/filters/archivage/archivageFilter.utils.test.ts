import { describe, it, expect } from "vitest";
import {
  isUserArchive,
  excludeArchivedUsers,
  keepOnlyArchivedUsers,
  keepArchivedInPeriode,
} from "./archivageFilter.utils";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { UserWithParcoursDetails } from "@/features/backoffice";

const JOUR_MS = 24 * 60 * 60 * 1000;
const ilYA = (jours: number) => new Date(Date.now() - jours * JOUR_MS);

function user(id: string, opts: { creeIlYA: number; archiveIlYA?: number }): UserWithParcoursDetails {
  const archive = opts.archiveIlYA !== undefined;
  return {
    user: { id },
    parcours: {
      id: `parcours-${id}`,
      situationParticulier: archive ? SituationParticulier.ARCHIVE : SituationParticulier.PROSPECT,
      createdAt: ilYA(opts.creeIlYA),
      archivedAt: archive ? ilYA(opts.archiveIlYA!) : null,
    },
  } as unknown as UserWithParcoursDetails;
}

describe("isUserArchive / excludeArchivedUsers / keepOnlyArchivedUsers", () => {
  const actif = user("actif", { creeIlYA: 10 });
  const archive = user("archive", { creeIlYA: 10, archiveIlYA: 2 });
  const sansParcours = { user: { id: "sans-parcours" }, parcours: null } as unknown as UserWithParcoursDetails;

  it("classe un parcours sans archivage, et un parcours sans parcours du tout, comme actif", () => {
    expect(isUserArchive(actif)).toBe(false);
    expect(isUserArchive(sansParcours)).toBe(false);
    expect(isUserArchive(archive)).toBe(true);
  });

  it("partitionne la liste sans perte", () => {
    const users = [actif, archive, sansParcours];
    expect(excludeArchivedUsers(users).map((u) => u.user.id)).toEqual(["actif", "sans-parcours"]);
    expect(keepOnlyArchivedUsers(users).map((u) => u.user.id)).toEqual(["archive"]);
  });
});

describe("keepArchivedInPeriode — fenêtre sur la date d'archivage", () => {
  it("garde un dossier archivé dans la fenêtre même si le parcours a été créé bien avant", () => {
    const users = [user("vieux-parcours-archive-hier", { creeIlYA: 200, archiveIlYA: 1 })];
    expect(keepArchivedInPeriode(users, "30j").map((u) => u.user.id)).toEqual(["vieux-parcours-archive-hier"]);
  });

  it("exclut un dossier archivé avant la fenêtre, même si le parcours est récent", () => {
    const users = [user("archive-il-y-a-60j", { creeIlYA: 90, archiveIlYA: 60 })];
    expect(keepArchivedInPeriode(users, "30j")).toEqual([]);
    expect(keepArchivedInPeriode(users, "90j").map((u) => u.user.id)).toEqual(["archive-il-y-a-60j"]);
  });

  it("exclut les dossiers non archivés", () => {
    expect(keepArchivedInPeriode([user("actif", { creeIlYA: 1 })], "30j")).toEqual([]);
  });

  it("garde tous les archivés depuis l'ouverture du service sur « tout »", () => {
    const users = [
      user("recent", { creeIlYA: 5, archiveIlYA: 1 }),
      user("ancien", { creeIlYA: 300, archiveIlYA: 250 }),
      user("actif", { creeIlYA: 5 }),
    ];
    expect(keepArchivedInPeriode(users, "tout").map((u) => u.user.id)).toEqual(["recent", "ancien"]);
  });
});
