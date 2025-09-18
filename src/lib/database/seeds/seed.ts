import "dotenv/config";
import { db } from "../client";
import { users } from "../schema";
import { sql } from "drizzle-orm";

// TODO : Modifier ce seed une fois spec finalisée avec Martin
async function seed() {
  console.log("Début du seeding...");

  try {
    // Nettoyer les tables (optionnel, utile pour les tests)
    if (process.env.CLEAR_DB === "true") {
      console.log("Nettoyage des tables...");
      await db.delete(users);
    }

    // Compter les utilisateurs existants
    const existingUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    console.log(`Utilisateurs existants: ${existingUsers[0].count}`);

    // Créer des utilisateurs de test
    const testUsers = [
      { fcId: "fc_test_user_1", lastLogin: new Date() },
      { fcId: "fc_test_user_2", lastLogin: new Date(Date.now() - 86400000) }, // Hier
      { fcId: "fc_test_user_3", lastLogin: new Date(Date.now() - 172800000) }, // Il y a 2 jours
    ];

    console.log("Création des utilisateurs de test...");

    for (const user of testUsers) {
      // Vérifier si l'utilisateur existe déjà
      const existing = await db
        .select()
        .from(users)
        .where(sql`fc_id = ${user.fcId}`);

      if (existing.length === 0) {
        const [created] = await db.insert(users).values(user).returning();
        console.log(`Créé: ${created.fcId}`);
      } else {
        console.log(`Existe déjà: ${user.fcId}`);
      }
    }

    // Afficher le total final
    const finalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    console.log(
      `\nSeeding terminé ! Total utilisateurs: ${finalCount[0].count}`
    );

    process.exit(0);
  } catch (error) {
    console.error("Erreur lors du seeding:", error);
    process.exit(1);
  }
}

// Protection contre l'exécution accidentelle en production
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error(
    "Seeding bloqué en production. Utilisez ALLOW_PROD_SEED=true pour forcer."
  );
  process.exit(1);
}

seed();
