CREATE TABLE "aircraft_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"manufacturer" text NOT NULL,
	"model" text NOT NULL,
	"business_rows" integer NOT NULL,
	"business_layout" text NOT NULL,
	"economy_rows" integer NOT NULL,
	"economy_layout" text NOT NULL,
	CONSTRAINT "aircraft_models_manufacturer_model_unique" UNIQUE("manufacturer","model")
);
--> statement-breakpoint
CREATE TABLE "airlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"logo" text NOT NULL,
	"description" text NOT NULL,
	"baggage_included" boolean DEFAULT false NOT NULL,
	CONSTRAINT "airlines_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "airports" (
	"id" serial PRIMARY KEY NOT NULL,
	"iata" char(3) NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"city_slug" text NOT NULL,
	"country" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"timezone" text NOT NULL,
	CONSTRAINT "airports_iata_unique" UNIQUE("iata")
);
--> statement-breakpoint
CREATE INDEX "airports_city_slug_index" ON "airports" USING btree ("city_slug");