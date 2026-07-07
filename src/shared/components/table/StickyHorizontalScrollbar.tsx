"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface StickyHorizontalScrollbarProps {
  /** Ref vers le conteneur scrollable horizontalement (ex. `.fr-table__container`). */
  containerRef: RefObject<HTMLDivElement | null>;
}

interface Metrics {
  left: number;
  width: number;
  scrollWidth: number;
}

/**
 * Barre de scroll horizontale collée en bas du viewport, synchronisée avec un
 * conteneur scrollable. Pour les souris à molette classiques : évite de descendre
 * en bas d'un long tableau pour atteindre sa vraie barre. Se masque quand il n'y a
 * pas de débordement ou quand la vraie barre du conteneur est déjà visible.
 */
export function StickyHorizontalScrollbar({ containerRef }: StickyHorizontalScrollbarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({ left: 0, width: 0, scrollWidth: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const bar = barRef.current;
    if (!container || !bar) return;

    function update() {
      const el = containerRef.current;
      const barEl = barRef.current;
      if (!el || !barEl) return;
      const rect = el.getBoundingClientRect();
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      // La vraie barre du conteneur est visible si son bas est dans le viewport.
      const bottomVisible = rect.bottom <= window.innerHeight;
      setVisible(hasOverflow && !bottomVisible);
      setMetrics((prev) =>
        prev.left === rect.left && prev.width === el.clientWidth && prev.scrollWidth === el.scrollWidth
          ? prev
          : { left: rect.left, width: el.clientWidth, scrollWidth: el.scrollWidth }
      );
      if (Math.round(barEl.scrollLeft) !== Math.round(el.scrollLeft)) {
        barEl.scrollLeft = el.scrollLeft;
      }
    }

    // La synchro s'auto-termine : réécrire une valeur identique n'émet pas de scroll.
    function onContainerScroll() {
      if (Math.round(bar!.scrollLeft) === Math.round(container!.scrollLeft)) return;
      bar!.scrollLeft = container!.scrollLeft;
    }
    function onBarScroll() {
      if (Math.round(container!.scrollLeft) === Math.round(bar!.scrollLeft)) return;
      container!.scrollLeft = bar!.scrollLeft;
    }

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    container.addEventListener("scroll", onContainerScroll, { passive: true });
    bar.addEventListener("scroll", onBarScroll, { passive: true });
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    resizeObserver?.observe(container);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      container.removeEventListener("scroll", onContainerScroll);
      bar.removeEventListener("scroll", onBarScroll);
      resizeObserver?.disconnect();
    };
  }, [containerRef]);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        bottom: 0,
        left: metrics.left,
        width: metrics.width,
        overflowX: "auto",
        overflowY: "hidden",
        zIndex: 750,
        display: visible ? "block" : "none",
      }}>
      <div style={{ width: metrics.scrollWidth, height: 1 }} />
    </div>
  );
}
