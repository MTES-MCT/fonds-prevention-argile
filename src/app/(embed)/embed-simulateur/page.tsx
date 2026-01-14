import { SimulateurFormulaire } from "@/features/simulateur";

export default async function EmbedSimulateurPage() {
  // Afficher le simulateur en mode embed
  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <SimulateurFormulaire />
    </div>
  );
}
