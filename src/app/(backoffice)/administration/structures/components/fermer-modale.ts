export function fermerModale(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal && window.dsfr) {
    window.dsfr(modal).modal.conceal();
  }
}
