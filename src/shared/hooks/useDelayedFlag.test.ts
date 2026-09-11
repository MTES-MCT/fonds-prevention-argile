import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDelayedFlag } from "./useDelayedFlag";

describe("useDelayedFlag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reste false tant que le délai n'est pas écoulé", () => {
    const { result } = renderHook(() => useDelayedFlag(true, 300));
    expect(result.current).toBe(false);

    vi.advanceTimersByTime(299);
    expect(result.current).toBe(false);
  });

  it("passe à true une fois le délai écoulé si toujours actif", () => {
    const { result } = renderHook(() => useDelayedFlag(true, 300));

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);
  });

  it("ne passe jamais à true si redevenu inactif avant le délai (pas de flash)", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 300), {
      initialProps: { active: true },
    });

    vi.advanceTimersByTime(100);
    rerender({ active: false });
    vi.advanceTimersByTime(300);

    expect(result.current).toBe(false);
  });

  it("redevient false immédiatement quand active repasse à faux, même après affichage", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 300), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    act(() => {
      rerender({ active: false });
    });
    expect(result.current).toBe(false);
  });
});
