import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LancerTestVulnerabiliteButton } from "./LancerTestVulnerabiliteButton";
import { useAdresseChoisieStore } from "@/shared/stores";
import { useVulnerabiliteStore } from "../../stores/vulnerabilite.store";
import { VulnerabiliteStep } from "../../domain/value-objects/vulnerabilite-step.enum";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ADRESSE = {
  label: "97 Rue de Notz 36000 Châteauroux",
  lat: 46.8,
  lon: 1.68,
  clefBan: "36044_2080_00097",
  codeInsee: "36044",
  communeNom: "Châteauroux",
  codeDepartement: "36",
  rnb: "RNB1",
  codeEpci: null,
};

describe("LancerTestVulnerabiliteButton", () => {
  beforeEach(() => {
    push.mockClear();
    useAdresseChoisieStore.getState().oublier();
    useVulnerabiliteStore.getState().reset();
  });

  it("mémorise l'adresse du compte puis ouvre le simulateur", () => {
    render(<LancerTestVulnerabiliteButton adresse={ADRESSE}>Faire le test</LancerTestVulnerabiliteButton>);

    fireEvent.click(screen.getByRole("button", { name: "Faire le test" }));

    expect(useAdresseChoisieStore.getState().adresse).toEqual(ADRESSE);
    expect(push).toHaveBeenCalledWith("/vulnerabilite-rga");
  });

  it("ouvre le simulateur sans toucher à l'adresse mémorisée quand le compte n'en a pas", () => {
    useAdresseChoisieStore.getState().memoriser(ADRESSE);
    render(<LancerTestVulnerabiliteButton adresse={null}>Faire le test</LancerTestVulnerabiliteButton>);

    fireEvent.click(screen.getByRole("button", { name: "Faire le test" }));

    expect(useAdresseChoisieStore.getState().adresse).toEqual(ADRESSE);
  });

  it("repart d'un parcours vierge pour refaire un test terminé", () => {
    useVulnerabiliteStore.getState().start();
    expect(useVulnerabiliteStore.getState().vulnerabilite.currentStep).not.toBe(VulnerabiliteStep.INTRO);
    render(
      <LancerTestVulnerabiliteButton adresse={null} recommencer>
        Refaire le test
      </LancerTestVulnerabiliteButton>
    );

    fireEvent.click(screen.getByRole("button", { name: "Refaire le test" }));

    expect(useVulnerabiliteStore.getState().vulnerabilite.currentStep).toBe(VulnerabiliteStep.INTRO);
  });
});
