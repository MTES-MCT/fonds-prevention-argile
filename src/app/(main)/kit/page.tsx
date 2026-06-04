import { redirect } from "next/navigation";

import { getServerEnv } from "@/shared/config/env.config";

// Redirige vers le kit de communication hébergé sur Notion (page statique publique).
// L'URL est surchargeable via KIT_COMMUNICATION_URL si le lien Notion change.
export default function KitPage() {
  redirect(getServerEnv().KIT_COMMUNICATION_URL);
}
