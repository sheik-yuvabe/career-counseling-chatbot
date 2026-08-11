-- Ten connected synthetic rows in every Module 3 knowledge table.
-- All records are visibly marked MOCK and use deterministic IDs.
-- This migration is additive and idempotent.

BEGIN;

INSERT INTO knowledge.knowledge_sources
  (id, source_key, name, source_type, base_url, publisher, license_ref,
   trust_level, status, created_at, updated_at)
SELECT
  ('f1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'mock-source-' || i,
  '[MOCK] Knowledge source ' || i,
  'synthetic_fixture', NULL, 'YuvaNext POC', NULL,
  'synthetic', 'active', '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z'
FROM generate_series(1, 10) AS i
ON CONFLICT (source_key) DO NOTHING;

INSERT INTO knowledge.dataset_versions
  (id, source_id, dataset_key, version, checksum, record_count,
   import_status, validation_report_json, imported_at, published_at, created_by)
SELECT
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('f1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'knowledge-mock-' || i, '2026-08-05-mock-' || i,
  md5('knowledge-mock-' || i) || md5('dataset-' || i),
  10, 'published',
  jsonb_build_object('status', 'validated', 'synthetic', true, 'issues', '[]'::jsonb),
  '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z', NULL
FROM generate_series(1, 10) AS i
ON CONFLICT (dataset_key, version) DO NOTHING;

INSERT INTO knowledge.education_routes
  (id, route_code, title, route_level, description, publication_status)
SELECT
  ('f3000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'MOCK-ROUTE-' || i, '[MOCK] Education route ' || i,
  CASE WHEN i <= 3 THEN 'certificate' WHEN i <= 6 THEN 'diploma' ELSE 'undergraduate' END,
  'Synthetic education route ' || i || ' for integration testing.', 'published'
FROM generate_series(1, 10) AS i
ON CONFLICT (route_code) DO NOTHING;

INSERT INTO knowledge.careers
  (id, onet_code, nco_code, slug, title, short_description, domain_code,
   primary_education_route_id, is_curated, publication_status,
   dataset_version_id, published_at, retired_at, created_at, updated_at)
SELECT
  ('f4000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  NULL, NULL, 'mock-career-' || i, '[MOCK] Career ' || i,
  'Synthetic career ' || i || ' for API and relationship testing.',
  (ARRAY['engineering','healthcare','technology','education','design'])[1 + ((i - 1) % 5)],
  ('f3000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  true, 'published',
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '2026-08-05T00:00:00Z', NULL, '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z'
FROM generate_series(1, 10) AS i
ON CONFLICT (slug) DO NOTHING;

INSERT INTO knowledge.career_interest_profiles
  (career_id, realistic, investigative, artistic, social, enterprising,
   conventional, high_point_code, profile_version, dataset_version_id)
SELECT
  ('f4000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (0.40 + i * 0.03)::numeric(6,5), (0.35 + i * 0.025)::numeric(6,5),
  (0.30 + i * 0.02)::numeric(6,5), (0.45 + i * 0.02)::numeric(6,5),
  (0.38 + i * 0.025)::numeric(6,5), (0.42 + i * 0.02)::numeric(6,5),
  CASE WHEN i <= 5 THEN 'R'::char(1) ELSE 'S'::char(1) END,
  'mock-v' || i,
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 10) AS i
ON CONFLICT (career_id) DO NOTHING;

INSERT INTO knowledge.career_value_profiles
  (career_id, achievement, independence, recognition, relationships,
   support, working_conditions, profile_version, dataset_version_id)
SELECT
  ('f4000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (0.50 + i * 0.02)::numeric(6,5), (0.45 + i * 0.02)::numeric(6,5),
  (0.40 + i * 0.02)::numeric(6,5), (0.55 + i * 0.02)::numeric(6,5),
  (0.48 + i * 0.02)::numeric(6,5), (0.52 + i * 0.02)::numeric(6,5),
  'mock-v' || i,
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 10) AS i
ON CONFLICT (career_id) DO NOTHING;

INSERT INTO knowledge.career_profiles
  (career_id, image_ref, salary_entry_band, salary_note, skills,
   next_role_3yr, progression_note, review_status, last_reviewed_at, reviewed_by)
SELECT
  ('f4000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'mock://career/' || i, '[MOCK] Salary band ' || i,
  'Synthetic salary; not labour-market evidence.',
  ARRAY['mock skill ' || i, 'mock communication', 'mock problem solving'],
  '[MOCK] Senior role ' || i, 'Synthetic progression example.',
  'reviewed', '2026-08-05T00:00:00Z', NULL
FROM generate_series(1, 10) AS i
ON CONFLICT (career_id) DO NOTHING;

INSERT INTO knowledge.pathways
  (id, pathway_code, title, description, education_route_id, duration_band,
   backup_route_note, publication_status, dataset_version_id)
SELECT
  ('f5000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'MOCK-PATHWAY-' || i, '[MOCK] Pathway ' || i,
  'Synthetic pathway ' || i || '.',
  ('f3000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '1-4 years', '[MOCK] Alternative route ' || i, 'published',
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 10) AS i
ON CONFLICT (pathway_code) DO NOTHING;

INSERT INTO knowledge.career_pathways
  (career_id, pathway_id, relationship_type, display_order)
SELECT
  ('f4000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('f5000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'primary', 1
FROM generate_series(1, 10) AS i
ON CONFLICT (career_id, pathway_id) DO NOTHING;

INSERT INTO knowledge.stream_options (id, stream_code, title, description, status)
SELECT
  ('f6000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'MOCK-STREAM-' || i, '[MOCK] Stream option ' || i,
  'Synthetic stream option ' || i || '.', 'active'
FROM generate_series(1, 10) AS i
ON CONFLICT (stream_code) DO NOTHING;

INSERT INTO knowledge.stream_maps
  (id, top_two_code, version, dataset_version_id, status, segment)
SELECT
  ('f7000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (ARRAY['RI','RA','RS','RE','RC','IA','IS','IE','IC','AS'])[i],
  'mock-map-' || i,
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'published', (ARRAY['explorer','pathfinder','launcher'])[1 + ((i - 1) % 3)]
FROM generate_series(1, 10) AS i
ON CONFLICT (top_two_code, version) DO NOTHING;

INSERT INTO knowledge.stream_map_items (map_id, stream_option_id, rank, reason_key)
SELECT
  ('f7000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (31000 + i)::smallint, 'MOCK_STREAM_REASON_' || i
FROM generate_series(1, 10) AS i
ON CONFLICT (map_id, stream_option_id) DO NOTHING;

INSERT INTO knowledge.colleges
  (id, external_code, name, city, state, institution_type, tier,
   admission_route, fees_band, website_url, verification_status,
   last_verified_at, dataset_version_id, created_at, updated_at)
SELECT
  ('f8000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'MOCK-COLLEGE-' || i, '[MOCK] College ' || i,
  (ARRAY['Chennai','Coimbatore','Madurai','Salem','Trichy'])[1 + ((i - 1) % 5)],
  'Tamil Nadu', 'synthetic', 3, '[MOCK] Admission route ' || i,
  '[MOCK] Fees band ' || i, 'https://example.com/mock-college-' || i,
  'verified', '2026-08-05T00:00:00Z',
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z'
FROM generate_series(1, 10) AS i
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge.disciplines (id, discipline_code, title, domain_code, status)
SELECT
  ('f9000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'MOCK-DISCIPLINE-' || i, '[MOCK] Discipline ' || i,
  (ARRAY['engineering','healthcare','technology','education','design'])[1 + ((i - 1) % 5)],
  'active'
FROM generate_series(1, 10) AS i
ON CONFLICT (discipline_code) DO NOTHING;

INSERT INTO knowledge.college_programs
  (id, college_id, discipline_id, program_name, qualification_level,
   duration_band, admission_route, fees_band, verification_status,
   last_verified_at, dataset_version_id)
SELECT
  ('fa000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('f8000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('f9000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '[MOCK] Programme ' || i, 'undergraduate', '3-4 years',
  '[MOCK] Admission route ' || i, '[MOCK] Fees band ' || i,
  'verified', '2026-08-05T00:00:00Z',
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 10) AS i
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge.pathway_disciplines
  (pathway_id, discipline_id, relevance_weight, mapping_version)
SELECT
  ('f5000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('f9000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (0.70 + i * 0.02)::numeric(6,5), 'mock-v' || i
FROM generate_series(1, 10) AS i
ON CONFLICT (pathway_id, discipline_id) DO NOTHING;

INSERT INTO knowledge.aid_schemes
  (id, aid_code, name, provider_type, provider, level, states,
   eligibility_summary, benefit_summary, amount_text, application_url,
   portal_name, apply_window_start, apply_window_end, verification_status,
   last_verified_at, dataset_version_id)
SELECT
  ('fb000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'MOCK-AID-' || i, '[MOCK] Student aid scheme ' || i,
  'synthetic', 'YuvaNext POC', 'undergraduate', ARRAY['Tamil Nadu'],
  'Synthetic eligibility rule ' || i || '.', 'Synthetic benefit ' || i || '.',
  '[MOCK] Up to INR ' || (10000 + i * 1000),
  'https://example.com/mock-aid-' || i, '[MOCK] Test portal',
  '2026-08-01', '2026-12-31', 'verified', '2026-08-05T00:00:00Z',
  ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 10) AS i
ON CONFLICT (aid_code) DO NOTHING;

INSERT INTO knowledge.aid_criteria
  (id, aid_scheme_id, criterion_type, operator, value_json,
   is_required, source_text, criterion_version)
SELECT
  ('fc000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('fb000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'annual_income', 'lte',
  jsonb_build_object('amount', 200000 + i * 10000, 'currency', 'INR', 'synthetic', true),
  true, '[MOCK] Synthetic annual-income criterion ' || i, 'mock-v' || i
FROM generate_series(1, 10) AS i
ON CONFLICT (id) DO NOTHING;

COMMIT;
