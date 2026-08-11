-- Remove only the 12 synthetic career rows confirmed to have no O*NET code.
-- Their source datasets and non-career fixtures remain for auditability and
-- because other knowledge records still reference those dataset versions.

BEGIN;

CREATE TEMP TABLE synthetic_careers_to_remove (id uuid PRIMARY KEY) ON COMMIT DROP;

INSERT INTO synthetic_careers_to_remove (id) VALUES
  ('94444444-4444-4444-8444-444444444444'),
  ('f0000000-0000-4000-8000-000000000004'),
  ('f4000000-0000-4000-8000-000000000001'),
  ('f4000000-0000-4000-8000-000000000002'),
  ('f4000000-0000-4000-8000-000000000003'),
  ('f4000000-0000-4000-8000-000000000004'),
  ('f4000000-0000-4000-8000-000000000005'),
  ('f4000000-0000-4000-8000-000000000006'),
  ('f4000000-0000-4000-8000-000000000007'),
  ('f4000000-0000-4000-8000-000000000008'),
  ('f4000000-0000-4000-8000-000000000009'),
  ('f4000000-0000-4000-8000-000000000010');

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT count(*) INTO invalid_count
  FROM knowledge.careers c
  JOIN synthetic_careers_to_remove t ON t.id = c.id
  WHERE c.onet_code IS NOT NULL;

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'Cleanup target unexpectedly has an O*NET code';
  END IF;
END $$;

-- Preserve historical synthetic recommendation rows and their entity snapshots,
-- while removing the foreign-key link to careers being deleted.
UPDATE recommendation.recommendation_items
SET career_id = NULL
WHERE career_id IN (SELECT id FROM synthetic_careers_to_remove);

DELETE FROM knowledge.career_pathways
WHERE career_id IN (SELECT id FROM synthetic_careers_to_remove);

DELETE FROM knowledge.career_profiles
WHERE career_id IN (SELECT id FROM synthetic_careers_to_remove);

DELETE FROM knowledge.career_value_profiles
WHERE career_id IN (SELECT id FROM synthetic_careers_to_remove);

DELETE FROM knowledge.career_interest_profiles
WHERE career_id IN (SELECT id FROM synthetic_careers_to_remove);

DELETE FROM knowledge.careers
WHERE id IN (SELECT id FROM synthetic_careers_to_remove);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM knowledge.careers WHERE onet_code IS NULL) THEN
    RAISE EXCEPTION 'Careers with null O*NET codes remain after cleanup';
  END IF;
END $$;

COMMIT;
