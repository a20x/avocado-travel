CREATE TABLE "catalog_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_links" ADD CONSTRAINT "catalog_links_section_id_catalog_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."catalog_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_sections" ADD CONSTRAINT "catalog_sections_parent_id_catalog_sections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."catalog_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_links_section_id_position_index" ON "catalog_links" USING btree ("section_id","position");--> statement-breakpoint
CREATE INDEX "catalog_sections_parent_id_position_index" ON "catalog_sections" USING btree ("parent_id","position");