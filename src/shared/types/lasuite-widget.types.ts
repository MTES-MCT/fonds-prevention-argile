interface LaSuiteWidgetCommand {
  // aria-label du bouton rond replié/déplié (lu par loader.js lui-même, distinct
  // du closeLabel imbriqué dans params ci-dessous, propre au panneau feedback.js).
  label?: string;
  closeLabel?: string;
  params: {
    api: string;
    channel: string;
    title?: string;
    placeholder?: string;
    emailPlaceholder?: string;
    submitText?: string;
    successText?: string;
    successText2?: string;
    closeLabel?: string;
  };
  script: string;
  widget: string;
}

// Nom de variable imposé par loader.js (contrat réel du script, distinct du
// nom "_lasuite_widget" indiqué dans la doc/l'exemple fourni par l'ANCT).
type LaSuiteWidgetQueue = ["loader", "init", LaSuiteWidgetCommand][];

interface WindowWithLaSuiteWidget extends Window {
  _stmsg_widget?: LaSuiteWidgetQueue;
}

declare global {
  interface Window {
    _stmsg_widget?: LaSuiteWidgetQueue;
  }
}

export type { WindowWithLaSuiteWidget, LaSuiteWidgetCommand, LaSuiteWidgetQueue };
