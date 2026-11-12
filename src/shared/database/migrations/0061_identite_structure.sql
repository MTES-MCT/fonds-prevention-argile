CREATE TYPE "public"."type_structure" AS ENUM('accompagnement', 'expert');--> statement-breakpoint
ALTER TABLE "structures" ADD COLUMN "type" "type_structure" DEFAULT 'accompagnement' NOT NULL;--> statement-breakpoint
ALTER TABLE "structures" ADD COLUMN "siret" varchar(14);--> statement-breakpoint
ALTER TABLE "structures" ADD COLUMN "adresse" varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "structures" ADD COLUMN "telephone" varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "structures" ADD COLUMN "horaires" text;--> statement-breakpoint
-- Une structure expert ne porte que l'expertise : un expert réuni à une AMO ou un Aller-vers repart seul.
DO $$
DECLARE
  ligne record;
  nouvelle uuid;
BEGIN
  FOR ligne IN
    SELECT e.id, e.nom
      FROM experts e
     WHERE EXISTS (SELECT 1 FROM entreprises_amo a WHERE a.structure_id = e.structure_id)
        OR EXISTS (SELECT 1 FROM allers_vers v WHERE v.structure_id = e.structure_id)
  LOOP
    INSERT INTO structures (nom, type) VALUES (ligne.nom, 'expert') RETURNING id INTO nouvelle;
    UPDATE experts SET structure_id = nouvelle WHERE id = ligne.id;
  END LOOP;
END $$;--> statement-breakpoint
UPDATE "structures" s
   SET "type" = 'expert'
 WHERE EXISTS (SELECT 1 FROM "experts" e WHERE e."structure_id" = s."id");--> statement-breakpoint
-- Identité reprise de l'AMO, à défaut de l'Aller-vers ; le SIRET de l'AMO, ou de l'expert pour une structure expert.
UPDATE "structures" s
   SET "siret" = COALESCE(NULLIF(a."siret", ''), NULLIF(e."siret", '')),
       "adresse" = COALESCE(NULLIF(a."adresse", ''), NULLIF(v."adresse", ''), ''),
       "telephone" = COALESCE(NULLIF(a."telephone", ''), NULLIF(v."telephone", ''), ''),
       "horaires" = COALESCE(NULLIF(a."horaires", ''), NULLIF(v."horaires", ''))
  FROM "structures" s2
  LEFT JOIN "entreprises_amo" a ON a."structure_id" = s2."id"
  LEFT JOIN "allers_vers" v ON v."structure_id" = s2."id"
  LEFT JOIN "experts" e ON e."structure_id" = s2."id"
 WHERE s."id" = s2."id";--> statement-breakpoint
ALTER TABLE "structures" ADD CONSTRAINT "structures_type_siret_unique" UNIQUE("type","siret");--> statement-breakpoint
-- Chaque ligne d'habilitation porte désormais l'identité de sa structure.
UPDATE "entreprises_amo" a
   SET "nom" = s."nom",
       "siret" = COALESCE(s."siret", a."siret"),
       "adresse" = s."adresse",
       "telephone" = s."telephone",
       "horaires" = s."horaires"
  FROM "structures" s
 WHERE s."id" = a."structure_id";--> statement-breakpoint
UPDATE "allers_vers" v
   SET "nom" = s."nom",
       "adresse" = s."adresse",
       "telephone" = s."telephone",
       "horaires" = s."horaires"
  FROM "structures" s
 WHERE s."id" = v."structure_id";--> statement-breakpoint
UPDATE "experts" e
   SET "nom" = s."nom",
       "siret" = COALESCE(s."siret", e."siret")
  FROM "structures" s
 WHERE s."id" = e."structure_id";--> statement-breakpoint
-- Transitoire, comme dans 0059 : une ligne insérée sans structure par l'ancien code en crée une qui porte son identité.
CREATE OR REPLACE FUNCTION "structure_par_defaut_amo"() RETURNS trigger AS $$
BEGIN
  IF NEW.structure_id IS NULL THEN
    SELECT structure_id INTO NEW.structure_id FROM entreprises_amo WHERE id = NEW.id OR siret = NEW.siret LIMIT 1;
  END IF;
  IF NEW.structure_id IS NULL THEN
    SELECT id INTO NEW.structure_id FROM structures WHERE type = 'accompagnement' AND siret = NULLIF(NEW.siret, '');
  END IF;
  IF NEW.structure_id IS NULL THEN
    INSERT INTO structures (nom, siret, adresse, telephone, horaires)
    VALUES (NEW.nom, NULLIF(NEW.siret, ''), NEW.adresse, NEW.telephone, NEW.horaires)
    RETURNING id INTO NEW.structure_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "structure_par_defaut_allers_vers"() RETURNS trigger AS $$
BEGIN
  IF NEW.structure_id IS NULL THEN
    SELECT structure_id INTO NEW.structure_id FROM allers_vers WHERE id = NEW.id LIMIT 1;
  END IF;
  IF NEW.structure_id IS NULL THEN
    INSERT INTO structures (nom, adresse, telephone, horaires)
    VALUES (NEW.nom, NEW.adresse, LEFT(NEW.telephone, 20), NEW.horaires)
    RETURNING id INTO NEW.structure_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
