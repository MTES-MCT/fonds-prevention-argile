"use client";

import { useEffect, type RefObject } from "react";

/** ~500 ms à 60 fps : au-delà, le DSFR ne s'initialisera plus. */
const MAX_ATTEMPTS = 30;

/**
 * Ouvre / ferme une modale DSFR.
 *
 * L'attribut HTML `open` ne suffit pas : il faut passer par `window.dsfr(dialog).modal`,
 * qui n'existe qu'une fois le DSFR initialisé — initialisation **asynchrone** (~100 ms),
 * souvent postérieure au montage quand on arrive sur une fenêtre fraîche (retour de
 * FranceConnect, typiquement). D'où le retry : sans lui, une modale montée **déjà ouverte**
 * reste invisible pour toujours, l'effet ne se rejouant jamais puisque `isOpen` ne change pas.
 */
export function useDsfrModal(dialogRef: RefObject<HTMLDialogElement | null>, isOpen: boolean) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let cancelled = false;
    let attempts = 0;

    const tryToggle = () => {
      if (cancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modalInstance = (window as any).dsfr?.(dialog)?.modal;
      if (modalInstance) {
        if (isOpen) modalInstance.disclose();
        else modalInstance.conceal();
        return;
      }

      if (++attempts < MAX_ATTEMPTS) requestAnimationFrame(tryToggle);
      else console.warn("[DSFR] Instance de modale indisponible après retries");
    };

    tryToggle();

    return () => {
      cancelled = true;
    };
  }, [dialogRef, isOpen]);
}
