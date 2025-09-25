import { DSStatus } from "@/lib/parcours/parcours.types";
import type { Dossier, DossierState } from "./types";

// Stockage en mémoire de l'état mocké actuel
let currentMockState: DossierState = DSStatus.EN_CONSTRUCTION as DossierState;

export class MockDemarchesSimplifieesClient {
  // Définir le statut mocké
  setMockState(state: DossierState) {
    currentMockState = state;
    console.log(`🎭 MOCK DS: État défini sur "${state}"`);
  }

  // Récupérer le statut actuel
  getMockState(): DossierState {
    return currentMockState;
  }

  async getDossier(dossierNumber: number): Promise<Dossier | null> {
    // Récupérer le statut depuis l'API route
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/test/mock-ds-status`);

    const { status } = await response.json();

    console.log(
      `MOCK DS: Récupération du dossier ${dossierNumber} avec état "${status}"`
    );

    return {
      id: `mock-${dossierNumber}`,
      number: dossierNumber,
      state: status,
      archived: false,
      datePassageEnConstruction: "2024-01-01",
      datePassageEnInstruction:
        currentMockState !== "en_construction" ? "2024-01-02" : undefined,
      dateTraitement: currentMockState === "accepte" ? "2024-01-03" : undefined,
      usager: { email: "test@example.com" },
      champs: [],
    } as Dossier;
  }

  // Les autres méthodes requises
  async getDemarcheDetailed() {
    return null;
  }

  async getDemarcheDossiers() {
    return null;
  }

  async getDemarcheSchema() {
    return null;
  }
}

// Instance globale
export const mockClient = new MockDemarchesSimplifieesClient();
