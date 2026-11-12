import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import AncienneGestionAmoPage from "./amo/page";
import AncienneGestionAllersVersPage from "./allers-vers/page";
import AncienneGestionExpertsPage from "./experts/page";

describe("anciennes pages AMO, Aller-vers et Experts", () => {
  it.each([
    ["/administration/amo", AncienneGestionAmoPage, "amo"],
    ["/administration/allers-vers", AncienneGestionAllersVersPage, "allersVers"],
    ["/administration/experts", AncienneGestionExpertsPage, "expert"],
  ])("%s renvoie vers les structures filtrées sur son habilitation", (_ancienne, Page, habilitation) => {
    expect(() => Page()).toThrow(`REDIRECT:/administration/structures?habilitation=${habilitation}`);
  });
});
