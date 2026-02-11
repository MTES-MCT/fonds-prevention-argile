-- 1. Changer la FK agent_id : CASCADE → SET NULL + nullable
ALTER TABLE "parcours_commentaires" DROP CONSTRAINT "parcours_commentaires_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "parcours_commentaires" ALTER COLUMN "agent_id" DROP NOT NULL;
--> statement-breakpoint

-- 2. Ajouter les colonnes snapshot (nullable d'abord pour la data migration)
ALTER TABLE "parcours_commentaires" ADD COLUMN "author_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "parcours_commentaires" ADD COLUMN "author_structure" varchar(255);
--> statement-breakpoint
ALTER TABLE "parcours_commentaires" ADD COLUMN "author_structure_type" varchar(50);
--> statement-breakpoint

-- 3. Remplir les colonnes snapshot pour les commentaires existants
UPDATE "parcours_commentaires" pc
SET
  "author_name" = CONCAT(a."given_name", COALESCE(' ' || a."usual_name", '')),
  "author_structure" = COALESCE(ea."nom", av."nom"),
  "author_structure_type" = CASE
    WHEN ea."id" IS NOT NULL THEN 'AMO'
    WHEN av."id" IS NOT NULL THEN 'ALLERS_VERS'
    ELSE 'ADMINISTRATION'
  END
FROM "agents" a
LEFT JOIN "entreprises_amo" ea ON a."entreprise_amo_id" = ea."id"
LEFT JOIN "allers_vers" av ON a."allers_vers_id" = av."id"
WHERE pc."agent_id" = a."id";
--> statement-breakpoint

-- 4. Passer author_name en NOT NULL
ALTER TABLE "parcours_commentaires" ALTER COLUMN "author_name" SET NOT NULL;
--> statement-breakpoint

-- 5. Recréer la FK avec SET NULL
ALTER TABLE "parcours_commentaires" ADD CONSTRAINT "parcours_commentaires_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
