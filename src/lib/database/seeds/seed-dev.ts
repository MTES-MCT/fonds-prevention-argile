import { db } from "../client";
import { users } from "../schema/users";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { dossiersDemarchesSimplifiees } from "../schema/dossiers-demarches-simplifiees";
import { Step, Status, DSStatus } from "@/lib/parcours/parcours.types";
import { STEP_ORDER } from "@/lib/parcours/parcours.constants";

async function seedDev() {
  console.log("Seeding database with fake data...");

  // Vérification environnement
  if (process.env.NODE_ENV === "production" && !process.env.FORCE_SEED) {
    console.error(
      "Cannot seed in production! Use FORCE_SEED=true to override"
    );
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
        step: Step.ELIGIBILITE,
        status: Status.VALIDE,
      },
      {
        fcId: "fc-test-user-2",
        name: "Jean Martin",
        step: Step.DIAGNOSTIC,
        status: Status.EN_INSTRUCTION,
      },
      {
        fcId: "fc-test-user-3",
        name: "Sophie Bernard",
        step: Step.DEVIS,
        status: Status.TODO,
      },
      {
        fcId: "fc-test-user-4",
        name: "Pierre Durand",
        step: Step.FACTURES,
        status: Status.EN_INSTRUCTION,
      },
      {
        fcId: "fc-test-user-5",
        name: "Lucie Moreau",
        step: Step.FACTURES,
        status: Status.VALIDE, // Parcours complet
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
            submittedAt:
              dsStatus !== DSStatus.EN_CONSTRUCTION ? new Date() : null,
            processedAt: dsStatus === DSStatus.ACCEPTE ? new Date() : null,
          })
          .onConflictDoNothing(); // Ignorer si existe déjà

        console.log(`Dossier ${step}: ${dsStatus}`);
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

/**
 * Détermine quelles étapes créer selon l'avancement actuel
 */
function getStepsToCreate(currentStep: Step): Step[] {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  return STEP_ORDER.slice(0, currentIndex + 1) as Step[];
}

/**
 * Détermine le statut DS approprié pour une étape
 */
function getDSStatusForStep(
  step: Step,
  currentStep: Step,
  currentStatus: Status
): DSStatus {
  const stepIndex = STEP_ORDER.indexOf(step);
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  if (stepIndex < currentIndex) {
    // Étapes passées sont validées
    return DSStatus.ACCEPTE;
  } else if (stepIndex === currentIndex) {
    // Étape actuelle - mapper le statut interne vers DS
    switch (currentStatus) {
      case Status.VALIDE:
        return DSStatus.ACCEPTE;
      case Status.EN_INSTRUCTION:
        return DSStatus.EN_INSTRUCTION;
      case Status.TODO:
        return DSStatus.EN_CONSTRUCTION;
      default:
        return DSStatus.EN_CONSTRUCTION;
    }
  }

  // Ne devrait pas arriver
  return DSStatus.EN_CONSTRUCTION;
}

/**
 * Retourne l'ID de démarche simulé pour chaque étape
 */
function getDemarcheIdForStep(step: Step): string {
  const demarcheIds: Record<Step, string> = {
    [Step.ELIGIBILITE]: "12345",
    [Step.DIAGNOSTIC]: "12346",
    [Step.DEVIS]: "12347",
    [Step.FACTURES]: "12348",
  };
  return demarcheIds[step];
}

// Script d'exécution directe
if (require.main === module) {
  seedDev().catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
}

// Export pour utilisation programmatique
export { seedDev };
