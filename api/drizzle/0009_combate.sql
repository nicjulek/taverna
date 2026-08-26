CREATE TABLE "combatants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"combat_id" uuid NOT NULL,
	"token_id" uuid,
	"name" text NOT NULL,
	"initiative" integer,
	"bonus" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"turn_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "combatants" ADD CONSTRAINT "combatants_combat_id_combats_id_fk" FOREIGN KEY ("combat_id") REFERENCES "public"."combats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combatants" ADD CONSTRAINT "combatants_token_id_scene_items_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."scene_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combatants" ADD CONSTRAINT "combatants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combats" ADD CONSTRAINT "combats_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combats" ADD CONSTRAINT "combats_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "combatants_combat_idx" ON "combatants" USING btree ("combat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "combats_campaign_idx" ON "combats" USING btree ("campaign_id");--> statement-breakpoint
ALTER TABLE "combatants" ALTER CONSTRAINT "combatants_combat_id_combats_id_fk" DEFERRABLE INITIALLY DEFERRED;
