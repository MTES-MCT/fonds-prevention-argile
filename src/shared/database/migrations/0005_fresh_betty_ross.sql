-- Migration 0005: Changement des enums + ajout email/telephone

-- 1. Supprimer les DEFAULT qui dépendent des enums
ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_status" DROP DEFAULT;

ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_step" DROP DEFAULT;

ALTER TABLE "dossiers_demarches_simplifiees" 
ALTER COLUMN "step" DROP DEFAULT;

-- 2. Convertir en text
ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_status" TYPE text;

ALTER TABLE "dossiers_demarches_simplifiees" 
ALTER COLUMN "step" TYPE text;

ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_step" TYPE text;

-- 3. Migrer les données (MAJUSCULES → minuscules)
UPDATE "parcours_prevention" 
SET "current_status" = LOWER("current_status");

UPDATE "parcours_prevention" 
SET "current_step" = LOWER("current_step");

UPDATE "dossiers_demarches_simplifiees" 
SET "step" = LOWER("step");

-- 4. Supprimer les anciens enums
DROP TYPE "public"."status";
DROP TYPE "public"."step";

-- 5. Créer les nouveaux enums
CREATE TYPE "public"."status" AS ENUM('todo', 'en_instruction', 'valide');
CREATE TYPE "public"."step" AS ENUM('choix_amo', 'eligibilite', 'diagnostic', 'devis', 'factures');

-- 6. Reconvertir en enum avec DEFAULT
ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_status" TYPE "public"."status" 
USING "current_status"::"public"."status";

ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_status" SET DEFAULT 'todo'::"public"."status";

ALTER TABLE "dossiers_demarches_simplifiees" 
ALTER COLUMN "step" TYPE "public"."step" 
USING "step"::"public"."step";

ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_step" TYPE "public"."step" 
USING "current_step"::"public"."step";

ALTER TABLE "parcours_prevention" 
ALTER COLUMN "current_step" SET DEFAULT 'choix_amo'::"public"."step";

-- 7. Ajouter les nouvelles colonnes email et telephone
ALTER TABLE "users" ADD COLUMN "email" varchar(255);
ALTER TABLE "users" ADD COLUMN "telephone" varchar(20);