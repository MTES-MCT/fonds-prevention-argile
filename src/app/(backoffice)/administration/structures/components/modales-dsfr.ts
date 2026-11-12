// Pour une modale ouverte hors d'un bouton `aria-controls` (menu « Gérer »).
export function ouvrirModale(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal && window.dsfr) {
    window.dsfr(modal).modal.disclose();
  }
}

export function fermerModale(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal && window.dsfr) {
    window.dsfr(modal).modal.conceal();
  }
}
