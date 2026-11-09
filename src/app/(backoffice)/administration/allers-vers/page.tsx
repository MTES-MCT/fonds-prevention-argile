import { redirect } from "next/navigation";

// Les habilitations se gèrent désormais depuis la fiche de leur structure.
export default function AncienneGestionAllersVersPage() {
  redirect("/administration/structures?habilitation=allersVers");
}
