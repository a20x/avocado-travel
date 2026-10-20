CREATE TABLE "flights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"airline_id" integer NOT NULL,
	"aircraft_model_id" integer NOT NULL,
	"origin_id" integer NOT NULL,
	"destination_id" integer NOT NULL,
	"departs_at" timestamp with time zone NOT NULL,
	"arrives_at" timestamp with time zone NOT NULL,
	"price_economy" integer NOT NULL,
	"price_business" integer NOT NULL,
	CONSTRAINT "flights_number_departsAt_unique" UNIQUE("number","departs_at"),
	CONSTRAINT "flights_arrival_after_departure" CHECK ("flights"."arrives_at" > "flights"."departs_at"),
	CONSTRAINT "flights_different_airports" CHECK ("flights"."origin_id" <> "flights"."destination_id"),
	CONSTRAINT "flights_prices_positive" CHECK ("flights"."price_economy" > 0 AND "flights"."price_business" > 0)
);
--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_airline_id_airlines_id_fk" FOREIGN KEY ("airline_id") REFERENCES "public"."airlines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_aircraft_model_id_aircraft_models_id_fk" FOREIGN KEY ("aircraft_model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_origin_id_airports_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."airports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_destination_id_airports_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."airports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flights_origin_id_destination_id_departs_at_index" ON "flights" USING btree ("origin_id","destination_id","departs_at");