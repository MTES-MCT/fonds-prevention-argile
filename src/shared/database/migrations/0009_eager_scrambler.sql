ALTER TABLE "parcours_amo_validations" ADD COLUMN "brevo_message_id" varchar(255);--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD COLUMN "email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD COLUMN "email_delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD COLUMN "email_opened_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD COLUMN "email_clicked_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD COLUMN "email_bounce_type" varchar(10);--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD COLUMN "email_bounce_reason" text;--> statement-breakpoint
CREATE INDEX "parcours_amo_validations_brevo_message_id_idx" ON "parcours_amo_validations" USING btree ("brevo_message_id");