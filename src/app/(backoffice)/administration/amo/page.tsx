import { redirect } from "next/navigation";

// Les habilitations se gèrent désormais depuis la fiche de leur structure.
export default function AncienneGestionAmoPage() {
  redirect("/administration/structures?habilitation=amo");
}
