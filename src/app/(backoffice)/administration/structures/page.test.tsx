import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/features/auth", () => ({
  checkAgentAccess: vi.fn(),
  ROUTES: { connexion: { agent: "/connexion/agent" } },
}));

vi.mock("@/shared/components", () => ({
  AccesNonAutoriseAdmin: function AccesNonAutoriseAdmin() {
    return null;
  },
}));

vi.mock(
  "@/features/backoffice",
  async () => import("@/features/backoffice/administration/structures/domain/regles-structures")
);

vi.mock("./components/StructuresPanel", () => ({
  default: function StructuresPanel() {
    return null;
  },
}));

vi.mock("./components/FicheStructurePanel", () => ({
  default: function FicheStructurePanel() {
    return null;
  },
}));

import StructuresPage from "./page";
import FicheStructurePage from "./[id]/page";
import { checkAgentAccess } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import StructuresPanel from "./components/StructuresPanel";
import FicheStructurePanel from "./components/FicheStructurePanel";

const connecter = (role: UserRole) =>
  vi.mocked(checkAgentAccess).mockResolvedValue({ hasAccess: true, user: { role } } as never);
const liste = (habilitation?: string) => StructuresPage({ searchParams: Promise.resolve({ habilitation }) });
const fiche = () => FicheStructurePage({ params: Promise.resolve({ id: "structure-1" }) });

describe("pages des structures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renvoie un visiteur non connecté vers la connexion agent", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue({ hasAccess: false, errorCode: "NOT_AUTHENTICATED" } as never);

    await expect(liste()).rejects.toThrow("REDIRECT:/connexion/agent");
    await expect(fiche()).rejects.toThrow("REDIRECT:/connexion/agent");
  });

  it.each([UserRole.ANALYSTE, UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS])(
    "refuse le rôle %s",
    async (role) => {
      connecter(role);

      expect((await liste()).type).toBe(AccesNonAutoriseAdmin);
      expect((await fiche()).type).toBe(AccesNonAutoriseAdmin);
    }
  );

  it.each([UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR])(
    "ouvre la liste et la fiche au rôle %s",
    async (role) => {
      connecter(role);

      const pageListe = await liste("expert");
      expect(pageListe.type).toBe(StructuresPanel);
      expect(pageListe.props).toEqual({ role, criteresInitiaux: ["expert"] });

      const pageFiche = await fiche();
      expect(pageFiche.type).toBe(FicheStructurePanel);
      expect(pageFiche.props).toEqual({ structureId: "structure-1", role });
    }
  );
});
