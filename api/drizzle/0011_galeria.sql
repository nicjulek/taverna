ALTER TABLE "assets" ADD COLUMN "kind" text DEFAULT 'map' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "original_size" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "assets" SET "kind" = 'audio' WHERE "mime" LIKE 'audio/%';--> statement-breakpoint
UPDATE "assets" SET "kind" = 'image' WHERE "id" IN (SELECT "asset_id" FROM "handouts" WHERE "asset_id" IS NOT NULL);--> statement-breakpoint
UPDATE "assets" SET "original_size" = "size";
