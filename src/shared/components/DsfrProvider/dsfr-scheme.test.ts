import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { syncStoredScheme } from "./dsfr-scheme";

describe("syncStoredScheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-fr-scheme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("écrase une préférence périmée par le scheme du layout", () => {
    document.documentElement.setAttribute("data-fr-scheme", "light");
    localStorage.setItem("scheme", "system");

    syncStoredScheme();

    expect(localStorage.getItem("scheme")).toBe("light");
  });

  it("initialise la préférence absente", () => {
    document.documentElement.setAttribute("data-fr-scheme", "light");

    syncStoredScheme();

    expect(localStorage.getItem("scheme")).toBe("light");
  });

  it("n'écrit rien quand la préférence est déjà alignée", () => {
    document.documentElement.setAttribute("data-fr-scheme", "light");
    localStorage.setItem("scheme", "light");
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    syncStoredScheme();

    expect(setItem).not.toHaveBeenCalled();
  });

  it("suit le layout s'il repasse en thème système", () => {
    document.documentElement.setAttribute("data-fr-scheme", "system");
    localStorage.setItem("scheme", "light");

    syncStoredScheme();

    expect(localStorage.getItem("scheme")).toBe("system");
  });

  it("laisse la préférence intacte si le layout ne déclare pas de scheme", () => {
    localStorage.setItem("scheme", "dark");

    syncStoredScheme();

    expect(localStorage.getItem("scheme")).toBe("dark");
  });

  it("ignore un scheme inconnu", () => {
    document.documentElement.setAttribute("data-fr-scheme", "sombre");
    localStorage.setItem("scheme", "dark");

    syncStoredScheme();

    expect(localStorage.getItem("scheme")).toBe("dark");
  });

  it("ne lève pas quand le stockage est indisponible", () => {
    document.documentElement.setAttribute("data-fr-scheme", "light");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => syncStoredScheme()).not.toThrow();
  });
});
