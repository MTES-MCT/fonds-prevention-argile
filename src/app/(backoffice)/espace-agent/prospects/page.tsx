import { permanentRedirect } from "next/navigation";

/**
 * Le listing prospects/dossiers est désormais unifié sur `/espace-agent/dossiers`.
 */
export default function ProspectsPage() {
  permanentRedirect("/espace-agent/dossiers");
}
