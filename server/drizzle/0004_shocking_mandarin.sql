CREATE TYPE "public"."quest_metric" AS ENUM('wins', 'captures', 'puzzles_solved', 'checkmates');--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "metric" "quest_metric" NOT NULL;