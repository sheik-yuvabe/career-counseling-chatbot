ALTER TABLE "recommendation"."recommendation_items"
  DROP CONSTRAINT IF EXISTS "recommendation_items_rank_key";

CREATE UNIQUE INDEX IF NOT EXISTS "recommendation_items_run_rank_key"
  ON "recommendation"."recommendation_items" ("recommendation_run_id", "rank");
