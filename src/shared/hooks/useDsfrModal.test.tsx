import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { useDsfrModal } from "./useDsfrModal";

const disclose = vi.fn();
const conceal = vi.fn();

function Modale({ isOpen }: { isOpen: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useDsfrModal(ref, isOpen);
  return <dialog ref={ref} />;
}

/** Rend le DSFR disponible après `apresNAppels` interrogations. */
function dsfrPretApres(apresNAppels: number) {
  let appels = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).dsfr = () => (++appels > apresNAppels ? { modal: { disclose, conceal } } : undefined);
}

/** Vide la file de requestAnimationFrame. */
async function laisserTournerLesRetries() {
  for (let i = 0; i < 40; i++) await new Promise((r) => requestAnimationFrame(() => r(null)));
}

describe("useDsfrModal", () => {
  beforeEach(() => {
    disclose.mockClear();
    conceal.mockClear();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).dsfr;
  });

  it("ouvre la modale quand le DSFR est déjà initialisé", () => {
    dsfrPretApres(0);

    render(<Modale isOpen />);

    expect(disclose).toHaveBeenCalledTimes(1);
  });

  it("réessaie jusqu'à l'initialisation du DSFR, montée déjà ouverte", async () => {
    // Le cas réel : /mon-compte atteint dans une fenêtre fraîche après FranceConnect.
    // Sans retry, l'effet abandonnait et la modale restait invisible pour toujours,
    // `isOpen` ne changeant jamais.
    dsfrPretApres(3);

    render(<Modale isOpen />);
    expect(disclose).not.toHaveBeenCalled();

    await laisserTournerLesRetries();

    expect(disclose).toHaveBeenCalledTimes(1);
  });

  it("ne tente plus rien après démontage", async () => {
    dsfrPretApres(5);

    const { unmount } = render(<Modale isOpen />);
    unmount();
    await laisserTournerLesRetries();

    expect(disclose).not.toHaveBeenCalled();
  });
});
