CREATE TABLE "wagers" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"venue_tier" text NOT NULL,
	"buy_in" bigint NOT NULL,
	"white_user_id" uuid,
	"black_user_id" uuid,
	"status" text DEFAULT 'held' NOT NULL,
	"result_type" text,
	"winner_user_id" uuid,
	"payout" bigint,
	"rake" bigint,
	"plies" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "chips_delta" integer;--> statement-breakpoint
ALTER TABLE "wagers" ADD CONSTRAINT "wagers_white_user_id_users_id_fk" FOREIGN KEY ("white_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wagers" ADD CONSTRAINT "wagers_black_user_id_users_id_fk" FOREIGN KEY ("black_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wagers_status_idx" ON "wagers" USING btree ("status","created_at");