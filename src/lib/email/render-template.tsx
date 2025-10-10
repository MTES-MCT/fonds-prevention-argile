import { render } from "@react-email/render";
import type { ReactElement } from "react";

/**
 * Convertit un composant React en HTML string
 */
export async function renderEmailTemplate(
  template: ReactElement
): Promise<string> {
  return render(template);
}
