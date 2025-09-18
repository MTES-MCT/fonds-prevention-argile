import { db } from "../client";
import { users } from "../schema/users";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { dossiersDemarchesSimplifiees } from "../schema/dossiers-demarches-simplifiees";
import { eq } from "drizzle-orm";
import type { Step, Status, DSStatus } from "../types/parcours.types";

async function seedDev() {
  console.log("Seeding database with fake data...");

  // Vérification environnement
  if (process.env.NODE_ENV === "production" && !process.env.FORCE_SEED) {
    console.error("Cannot seed in production! Use FORCE_SEED=true to override");
    process.exit(1);
  }

  try {
    // Clear existing data si demandé
    if (process.env.CLEAR_DB === "true") {
      console.log("Clearing existing data...");
      await db.delete(dossiersDemarchesSimplifiees);
      await db.delete(parcoursPrevention);
      await db.delete(users);
    }

    // Créer plusieurs utilisateurs avec différents états de parcours
    const testUsers = [
      {
        fcId: "fc-test-user-1",
        name: "Marie Dubois",
        step: "ELIGIBILITE" as Step,
        status: "VALIDE" as Status,
      },
      {
        fcId: "fc-test-user-2",
        name: "Jean Martin",
        step: "DIAGNOSTIC" as Step,
        status: "EN_INSTRUCTION" as Status,
      },
      {
        fcId: "fc-test-user-3",
        name: "Sophie Bernard",
        step: "DEVIS" as Step,
        status: "TODO" as Status,
      },
      {
        fcId: "fc-test-user-4",
        name: "Pierre Durand",
        step: "FACTURES" as Step,
        status: "EN_INSTRUCTION" as Status,
      },
      {
        fcId: "fc-test-user-5",
        name: "Lucie Moreau",
        step: "FACTURES" as Step,
        status: "VALIDE" as Status, // Parcours complet
      },
    ];

    for (const testUser of testUsers) {
      console.log(`Creating user: ${testUser.name}`);

      // 1. Créer l'utilisateur
      const [user] = await db
        .insert(users)
        .values({
          fcId: testUser.fcId,
          lastLogin: new Date(),
        })
        .onConflictDoUpdate({
          target: users.fcId,
          set: { lastLogin: new Date() },
        })
        .returning();

      // 2. Créer le parcours
      const [parcours] = await db
        .insert(parcoursPrevention)
        .values({
          userId: user.id,
          currentStep: testUser.step,
          currentStatus: testUser.status,
          completedAt: testUser.name === "Lucie Moreau" ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: parcoursPrevention.userId,
          set: {
            currentStep: testUser.step,
            currentStatus: testUser.status,
            updatedAt: new Date(),
          },
        })
        .returning();

      // 3. Créer les dossiers DS selon l'avancement
      const stepsToCreate = getStepsToCreate(testUser.step);

      for (const step of stepsToCreate) {
        const dsStatus = getDSStatusForStep(
          step,
          testUser.step,
          testUser.status
        );

        await db
          .insert(dossiersDemarchesSimplifiees)
          .values({
            parcoursId: parcours.id,
            step: step,
            dsNumber: `DS-2024-${Math.floor(Math.random() * 100000)}`,
            dsId: `ds-${step.toLowerCase()}-${user.id.substring(0, 8)}`,
            dsDemarcheId: getDemarcheIdForStep(step),
            dsStatus: dsStatus,
            dsUrl: `https://demarches-simplifiees.fr/dossiers/${Math.floor(Math.random() * 1000000)}`,
            submittedAt: dsStatus !== "en_construction" ? new Date() : null,
            processedAt: dsStatus === "accepte" ? new Date() : null,
          })
          .onConflictDoNothing(); // Ignorer si existe déjà

        console.log(`  - Dossier ${step}: ${dsStatus}`);
      }
    }

    // Statistiques finales
    const userCount = await db.$count(users);
    const parcoursCount = await db.$count(parcoursPrevention);
    const dossierCount = await db.$count(dossiersDemarchesSimplifiees);

    console.log("\nSeed completed:");
    console.log(`  - ${userCount} users`);
    console.log(`  - ${parcoursCount} parcours`);
    console.log(`  - ${dossierCount} dossiers DS`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

// Helper: Quelles étapes créer selon l'avancement
function getStepsToCreate(currentStep: Step): Step[] {
  const steps: Step[] = ["ELIGIBILITE", "DIAGNOSTIC", "DEVIS", "FACTURES"];
  const currentIndex = steps.indexOf(currentStep);
  return steps.slice(0, currentIndex + 1);
}

// Helper: Statut DS selon l'étape
function getDSStatusForStep(
  step: Step,
  currentStep: Step,
  currentStatus: Status
): DSStatus {
  const steps: Step[] = ["ELIGIBILITE", "DIAGNOSTIC", "DEVIS", "FACTURES"];
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(currentStep);

  if (stepIndex < currentIndex) {
    return "accepte"; // Étapes passées sont validées
  } else if (stepIndex === currentIndex) {
    // Étape actuelle
    switch (currentStatus) {
      case "VALIDE":
        return "accepte";
      case "EN_INSTRUCTION":
        return "en_instruction";
      default:
        return "en_construction";
    }
  }
  return "en_construction"; // Ne devrait pas arriver
}

// Helper: ID de démarche par étape (simulé)
function getDemarcheIdForStep(step: Step): string {
  const ids: Record<Step, string> = {
    ELIGIBILITE: "12345",
    DIAGNOSTIC: "12346",
    DEVIS: "12347",
    FACTURES: "12348",
  };
  return ids[step];
}

// Lancer le seed
seedDev().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
