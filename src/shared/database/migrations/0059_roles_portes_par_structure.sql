CREATE TABLE "structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "structure_id" uuid;--> statement-breakpoint
ALTER TABLE "allers_vers" ADD COLUMN "structure_id" uuid;--> statement-breakpoint
ALTER TABLE "entreprises_amo" ADD COLUMN "structure_id" uuid;--> statement-breakpoint
-- Une AMO et un Aller-vers reliés par des agents hybrides forment une structure : la relation doit être 1:1.
DO $$
DECLARE
  ambigues text;
BEGIN
  WITH paires AS (
    SELECT DISTINCT entreprise_amo_id AS amo_id, allers_vers_id AS av_id
    FROM agents
    WHERE role = 'amo_et_allers_vers' AND entreprise_amo_id IS NOT NULL AND allers_vers_id IS NOT NULL
  )
  SELECT string_agg(nom, ', ') INTO ambigues FROM (
    SELECT ea.nom FROM paires p JOIN entreprises_amo ea ON ea.id = p.amo_id GROUP BY ea.id, ea.nom HAVING count(*) > 1
    UNION ALL
    SELECT av.nom FROM paires p JOIN allers_vers av ON av.id = p.av_id GROUP BY av.id, av.nom HAVING count(*) > 1
  ) s;

  IF ambigues IS NOT NULL THEN
    RAISE EXCEPTION 'Agents hybrides : structure reliée à plusieurs partenaires (%)', ambigues;
  END IF;
END $$;--> statement-breakpoint
CREATE TEMP TABLE "paires_structures" ON COMMIT DROP AS
SELECT gen_random_uuid() AS structure_id, amo_id, av_id FROM (
  SELECT DISTINCT entreprise_amo_id AS amo_id, allers_vers_id AS av_id
  FROM agents
  WHERE role = 'amo_et_allers_vers' AND entreprise_amo_id IS NOT NULL AND allers_vers_id IS NOT NULL
) p;--> statement-breakpoint
-- Une structure à deux rôles prend le nom de son AMO ; noms, contacts et territoires des deux lignes restent tels quels.
INSERT INTO "structures" ("id", "nom")
SELECT p.structure_id, ea.nom FROM paires_structures p JOIN entreprises_amo ea ON ea.id = p.amo_id;--> statement-breakpoint
UPDATE "entreprises_amo" ea SET "structure_id" = p.structure_id FROM paires_structures p WHERE ea.id = p.amo_id;--> statement-breakpoint
UPDATE "allers_vers" av SET "structure_id" = p.structure_id FROM paires_structures p WHERE av.id = p.av_id;--> statement-breakpoint
UPDATE "entreprises_amo" SET "structure_id" = gen_random_uuid() WHERE "structure_id" IS NULL;--> statement-breakpoint
UPDATE "allers_vers" SET "structure_id" = gen_random_uuid() WHERE "structure_id" IS NULL;--> statement-breakpoint
INSERT INTO "structures" ("id", "nom")
SELECT structure_id, nom FROM entreprises_amo ea
WHERE NOT EXISTS (SELECT 1 FROM structures s WHERE s.id = ea.structure_id);--> statement-breakpoint
INSERT INTO "structures" ("id", "nom")
SELECT structure_id, nom FROM allers_vers av
WHERE NOT EXISTS (SELECT 1 FROM structures s WHERE s.id = av.structure_id);--> statement-breakpoint
-- Seul le rattachement que lit le rôle compte, comme dans l'ancien code ; sans lui, ni structure ni rôle.
UPDATE "agents" a SET "structure_id" = COALESCE(
  CASE WHEN a.role IN ('amo', 'amo_et_allers_vers')
    THEN (SELECT ea.structure_id FROM entreprises_amo ea WHERE ea.id = a.entreprise_amo_id) END,
  CASE WHEN a.role IN ('allers_vers', 'amo_et_allers_vers')
    THEN (SELECT av.structure_id FROM allers_vers av WHERE av.id = a.allers_vers_id) END
)
WHERE a.role IN ('amo', 'allers_vers', 'amo_et_allers_vers');--> statement-breakpoint
ALTER TABLE "allers_vers" ALTER COLUMN "structure_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "entreprises_amo" ALTER COLUMN "structure_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_structure_id_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allers_vers" ADD CONSTRAINT "allers_vers_structure_id_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entreprises_amo" ADD CONSTRAINT "entreprises_amo_structure_id_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allers_vers" ADD CONSTRAINT "allers_vers_structure_id_unique" UNIQUE("structure_id");--> statement-breakpoint
ALTER TABLE "entreprises_amo" ADD CONSTRAINT "entreprises_amo_structure_id_unique" UNIQUE("structure_id");--> statement-breakpoint
-- Transitoire (retiré à la PR 3) : l'ancien code, pendant le postdeploy ou après un retour arrière, insère sans structure.
-- Un upsert déclenche aussi ce trigger : la ligne existante garde sa structure au lieu d'en créer une orpheline.
CREATE FUNCTION "structure_par_defaut_amo"() RETURNS trigger AS $$
BEGIN
  IF NEW.structure_id IS NULL THEN
    SELECT structure_id INTO NEW.structure_id FROM entreprises_amo WHERE id = NEW.id OR siret = NEW.siret LIMIT 1;
  END IF;
  IF NEW.structure_id IS NULL THEN
    INSERT INTO structures (nom) VALUES (NEW.nom) RETURNING id INTO NEW.structure_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE FUNCTION "structure_par_defaut_allers_vers"() RETURNS trigger AS $$
BEGIN
  IF NEW.structure_id IS NULL THEN
    SELECT structure_id INTO NEW.structure_id FROM allers_vers WHERE id = NEW.id LIMIT 1;
  END IF;
  IF NEW.structure_id IS NULL THEN
    INSERT INTO structures (nom) VALUES (NEW.nom) RETURNING id INTO NEW.structure_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "entreprises_amo_structure_par_defaut" BEFORE INSERT ON "entreprises_amo"
FOR EACH ROW EXECUTE FUNCTION structure_par_defaut_amo();--> statement-breakpoint
CREATE TRIGGER "allers_vers_structure_par_defaut" BEFORE INSERT ON "allers_vers"
FOR EACH ROW EXECUTE FUNCTION structure_par_defaut_allers_vers();--> statement-breakpoint
-- Transitoire (retiré à la PR 3) : l'ancien code rattache un agent par les colonnes héritées, sans connaître structure_id.
CREATE FUNCTION "structure_agent_depuis_rattachements"() RETURNS trigger AS $$
DECLARE
  structure_amo uuid;
  structure_av uuid;
BEGIN
  -- Le nouveau code écrit structure_id lui-même ; une mise à NULL par clé étrangère (ligne supprimée) n'y touche pas.
  IF (TG_OP = 'INSERT' AND NEW.structure_id IS NOT NULL)
    OR (TG_OP = 'UPDATE' AND NEW.structure_id IS DISTINCT FROM OLD.structure_id)
    OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF NEW.role NOT IN ('amo', 'allers_vers', 'amo_et_allers_vers') THEN
    NEW.structure_id := NULL;
    RETURN NEW;
  END IF;
  IF NEW.role IN ('amo', 'amo_et_allers_vers') THEN
    SELECT structure_id INTO structure_amo FROM entreprises_amo WHERE id = NEW.entreprise_amo_id;
  END IF;
  IF NEW.role IN ('allers_vers', 'amo_et_allers_vers') THEN
    SELECT structure_id INTO structure_av FROM allers_vers WHERE id = NEW.allers_vers_id;
  END IF;
  IF structure_amo <> structure_av THEN
    RAISE EXCEPTION 'Agent hybride : l''AMO et l''Aller-vers relèvent de deux structures différentes';
  END IF;
  NEW.structure_id := COALESCE(structure_amo, structure_av);
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "agents_structure_depuis_rattachements"
BEFORE INSERT OR UPDATE OF "role", "entreprise_amo_id", "allers_vers_id" ON "agents"
FOR EACH ROW EXECUTE FUNCTION structure_agent_depuis_rattachements();
