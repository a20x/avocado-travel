CREATE TABLE "forum_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "forum_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"author_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	"posts_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_posts_topic_id_created_at_index" ON "forum_posts" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_topics_last_post_at_index" ON "forum_topics" USING btree ("last_post_at");