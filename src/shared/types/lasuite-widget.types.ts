interface LaSuiteWidgetCommand {
  params: { api: string; channel: string };
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
