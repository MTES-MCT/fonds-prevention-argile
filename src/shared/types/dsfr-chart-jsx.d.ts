// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "line-chart": {
        x?: string;
        y?: string;
        "selected-palette"?: string;
        "unit-tooltip"?: string;
        [key: string]: unknown;
      };
    }
  }
}
