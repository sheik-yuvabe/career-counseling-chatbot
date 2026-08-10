CREATE INDEX IF NOT EXISTS recommendation_runs_input_reuse_idx
  ON recommendation.recommendation_runs (profile_snapshot_id, kind, input_hash, completed_at DESC)
  WHERE status = 'completed';
