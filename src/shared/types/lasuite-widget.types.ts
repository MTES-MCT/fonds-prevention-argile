interface LaSuiteWidgetCommand {
  params: { api: string; channel: string };
  script: string;
  widget: string;
}

type LaSuiteWidgetQueue = ["loader", "init", LaSuiteWidgetCommand][];

interface WindowWithLaSuiteWidget extends Window {
  _lasuite_widget?: LaSuiteWidgetQueue;
}

declare global {
  interface Window {
    _lasuite_widget?: LaSuiteWidgetQueue;
  }
}

export type { WindowWithLaSuiteWidget, LaSuiteWidgetCommand, LaSuiteWidgetQueue };
