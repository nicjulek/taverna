CREATE TABLE "compendium_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system" text DEFAULT 'dnd5e' NOT NULL,
	"campaign_id" uuid,
	"author_id" uuid,
	"kind" text NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"lang" text DEFAULT 'pt-BR' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compendium_entries" ADD CONSTRAINT "compendium_entries_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compendium_entries" ADD CONSTRAINT "compendium_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "compendium_slug_idx" ON "compendium_entries" USING btree ("system","slug");--> statement-breakpoint
CREATE INDEX "compendium_kind_name_idx" ON "compendium_entries" USING btree ("system","kind","name");--> statement-breakpoint
CREATE INDEX "compendium_campaign_idx" ON "compendium_entries" USING btree ("campaign_id");