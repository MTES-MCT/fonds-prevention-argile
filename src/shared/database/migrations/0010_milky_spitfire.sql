DO $$ BEGIN
 CREATE TYPE "public"."agent_role" AS ENUM('ADMIN', 'INSTRUCTEUR', 'AMO');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"given_name" varchar(255) NOT NULL,
	"usual_name" varchar(255) NOT NULL,
	"uid" varchar(255),
	"siret" varchar(14),
	"phone" varchar(50),
	"organizational_unit" varchar(255),
	"role" "agent_role" DEFAULT 'INSTRUCTEUR' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_sub_unique" UNIQUE("sub"),
	CONSTRAINT "agents_email_unique" UNIQUE("email")
);