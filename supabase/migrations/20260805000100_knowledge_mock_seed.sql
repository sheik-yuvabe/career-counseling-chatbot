-- Synthetic, connected Module 3 fixture data for hosted POC testing.
-- Every visible label is marked MOCK so these rows cannot be mistaken for
-- authoritative O*NET, NCO, AISHE, college, or scholarship information.
-- Inserts are idempotent and do not delete or overwrite imported datasets.

BEGIN;

INSERT INTO knowledge.knowledge_sources (
  id, source_key, name, source_type, base_url, publisher, license_ref,
  trust_level, status, created_at, updated_at
) VALUES (
  'f0000000-0000-4000-8000-000000000001',
  'yuvanext-full-knowledge-mock',
  'YuvaNext full knowledge mock fixture',
  'synthetic_fixture',
  NULL,
  'YuvaNext POC',
  NULL,
  'synthetic',
  'active',
  '2026-08-05T00:00:00Z',
  '2026-08-05T00:00:00Z'
) ON CONFLICT (source_key) DO NOTHING;

INSERT INTO knowledge.dataset_versions (
  id, source_id, dataset_key, version, checksum, record_count,
  import_status, validation_report_json, imported_at, published_at, created_by
) VALUES (
  'f0000000-0000-4000-8000-000000000002',
  'f0000000-0000-4000-8000-000000000001',
  'knowledge-full-mock',
  '2026-08-05',
  'f5b595d9eab8750957db0218d644a51002d0cd9e274f5b3f643d1b884f7f08df',
  18,
  'published',
  '{"status":"validated","synthetic":true,"issues":[]}'::jsonb,
  '2026-08-05T00:00:00Z',
  '2026-08-05T00:00:00Z',
  NULL
) ON CONFLICT (dataset_key, version) DO NOTHING;

INSERT INTO knowledge.education_routes (
  id, route_code, title, route_level, description, publication_status
) VALUES (
  'f0000000-0000-4000-8000-000000000003',
  'MOCK-BTECH',
  '[MOCK] Bachelor of Technology route',
  'undergraduate',
  'Synthetic education route used only for Module 3 integration testing.',
  'published'
) ON CONFLICT (route_code) DO NOTHING;

INSERT INTO knowledge.careers (
  id, onet_code, nco_code, slug, title, short_description, domain_code,
  primary_education_route_id, is_curated, publication_status,
  dataset_version_id, published_at, retired_at, created_at, updated_at
) VALUES (
  'f0000000-0000-4000-8000-000000000004',
  NULL,
  NULL,
  'mock-renewable-energy-technician',
  '[MOCK] Renewable Energy Technician',
  'Synthetic career record for end-to-end database and API testing.',
  'engineering',
  'f0000000-0000-4000-8000-000000000003',
  true,
  'published',
  'f0000000-0000-4000-8000-000000000002',
  '2026-08-05T00:00:00Z',
  NULL,
  '2026-08-05T00:00:00Z',
  '2026-08-05T00:00:00Z'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO knowledge.career_interest_profiles (
  career_id, realistic, investigative, artistic, social, enterprising,
  conventional, high_point_code, profile_version, dataset_version_id
) VALUES (
  'f0000000-0000-4000-8000-000000000004',
  0.85000, 0.70000, 0.25000, 0.40000, 0.50000, 0.55000,
  'R', 'mock-v1', 'f0000000-0000-4000-8000-000000000002'
) ON CONFLICT (career_id) DO NOTHING;

INSERT INTO knowledge.career_value_profiles (
  career_id, achievement, independence, recognition, relationships,
  support, working_conditions, profile_version, dataset_version_id
) VALUES (
  'f0000000-0000-4000-8000-000000000004',
  0.75000, 0.65000, 0.45000, 0.60000, 0.55000, 0.70000,
  'mock-v1', 'f0000000-0000-4000-8000-000000000002'
) ON CONFLICT (career_id) DO NOTHING;

INSERT INTO knowledge.career_profiles (
  career_id, image_ref, salary_entry_band, salary_note, skills,
  next_role_3yr, progression_note, review_status, last_reviewed_at, reviewed_by
) VALUES (
  'f0000000-0000-4000-8000-000000000004',
  'mock://career/renewable-energy-technician',
  '[MOCK] INR 2.5-4.0 LPA',
  'Synthetic amount; never show as verified labour-market evidence.',
  ARRAY['mock electrical basics', 'mock maintenance', 'mock safety practice'],
  '[MOCK] Senior Renewable Energy Technician',
  'Synthetic progression example for UI testing only.',
  'reviewed',
  '2026-08-05T00:00:00Z',
  NULL
) ON CONFLICT (career_id) DO NOTHING;

INSERT INTO knowledge.pathways (
  id, pathway_code, title, description, education_route_id, duration_band,
  backup_route_note, publication_status, dataset_version_id
) VALUES (
  'f0000000-0000-4000-8000-000000000005',
  'MOCK-RENEWABLE-TECH',
  '[MOCK] Renewable Energy Technology pathway',
  'Synthetic pathway joining the mock career, discipline and college programme.',
  'f0000000-0000-4000-8000-000000000003',
  '3-4 years',
  '[MOCK] Diploma route may be explored.',
  'published',
  'f0000000-0000-4000-8000-000000000002'
) ON CONFLICT (pathway_code) DO NOTHING;

INSERT INTO knowledge.career_pathways (
  career_id, pathway_id, relationship_type, display_order
) VALUES (
  'f0000000-0000-4000-8000-000000000004',
  'f0000000-0000-4000-8000-000000000005',
  'primary',
  1
) ON CONFLICT (career_id, pathway_id) DO NOTHING;

INSERT INTO knowledge.stream_options (
  id, stream_code, title, description, status
) VALUES (
  'f0000000-0000-4000-8000-000000000006',
  'MOCK-SCIENCE-PCM',
  '[MOCK] Science PCM',
  'Synthetic Physics, Chemistry and Mathematics stream option.',
  'active'
) ON CONFLICT (stream_code) DO NOTHING;

INSERT INTO knowledge.stream_maps (
  id, top_two_code, version, dataset_version_id, status, segment
) VALUES (
  'f0000000-0000-4000-8000-000000000007',
  'RC',
  'mock-2026-08-05',
  'f0000000-0000-4000-8000-000000000002',
  'published',
  'explorer'
) ON CONFLICT (top_two_code, version) DO NOTHING;

INSERT INTO knowledge.stream_map_items (
  map_id, stream_option_id, rank, reason_key
) VALUES (
  'f0000000-0000-4000-8000-000000000007',
  'f0000000-0000-4000-8000-000000000006',
  30001,
  'MOCK_RC_PRACTICAL_STRUCTURE'
) ON CONFLICT (map_id, stream_option_id) DO NOTHING;

INSERT INTO knowledge.colleges (
  id, external_code, name, city, state, institution_type, tier,
  admission_route, fees_band, website_url, verification_status,
  last_verified_at, dataset_version_id, created_at, updated_at
) VALUES (
  'f0000000-0000-4000-8000-000000000008',
  'MOCK-COLLEGE-001',
  '[MOCK] YuvaNext Institute of Sustainable Technology',
  'Chennai',
  'Tamil Nadu',
  'synthetic',
  3,
  '[MOCK] Merit counselling',
  '[MOCK] INR 50,000-100,000 per year',
  'https://example.com/mock-yuvanext-college',
  'verified',
  '2026-08-05T00:00:00Z',
  'f0000000-0000-4000-8000-000000000002',
  '2026-08-05T00:00:00Z',
  '2026-08-05T00:00:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge.disciplines (
  id, discipline_code, title, domain_code, status
) VALUES (
  'f0000000-0000-4000-8000-000000000009',
  'MOCK-RENEWABLE-ENERGY',
  '[MOCK] Renewable Energy Engineering',
  'engineering',
  'active'
) ON CONFLICT (discipline_code) DO NOTHING;

INSERT INTO knowledge.college_programs (
  id, college_id, discipline_id, program_name, qualification_level,
  duration_band, admission_route, fees_band, verification_status,
  last_verified_at, dataset_version_id
) VALUES (
  'f0000000-0000-4000-8000-00000000000a',
  'f0000000-0000-4000-8000-000000000008',
  'f0000000-0000-4000-8000-000000000009',
  '[MOCK] B.Tech Renewable Energy Engineering',
  'undergraduate',
  '4 years',
  '[MOCK] Merit counselling',
  '[MOCK] INR 50,000-100,000 per year',
  'verified',
  '2026-08-05T00:00:00Z',
  'f0000000-0000-4000-8000-000000000002'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge.pathway_disciplines (
  pathway_id, discipline_id, relevance_weight, mapping_version
) VALUES (
  'f0000000-0000-4000-8000-000000000005',
  'f0000000-0000-4000-8000-000000000009',
  1.00000,
  'mock-v1'
) ON CONFLICT (pathway_id, discipline_id) DO NOTHING;

INSERT INTO knowledge.aid_schemes (
  id, aid_code, name, provider_type, provider, level, states,
  eligibility_summary, benefit_summary, amount_text, application_url,
  portal_name, apply_window_start, apply_window_end, verification_status,
  last_verified_at, dataset_version_id
) VALUES (
  'f0000000-0000-4000-8000-00000000000b',
  'MOCK-GREEN-TECH-AID',
  '[MOCK] Green Technology Student Support',
  'synthetic',
  'YuvaNext POC',
  'undergraduate',
  ARRAY['Tamil Nadu'],
  'Synthetic example: annual household income at or below INR 300,000.',
  'Synthetic tuition support example.',
  '[MOCK] Up to INR 25,000',
  'https://example.com/mock-green-tech-aid',
  '[MOCK] YuvaNext test portal',
  '2026-08-01',
  '2026-12-31',
  'verified',
  '2026-08-05T00:00:00Z',
  'f0000000-0000-4000-8000-000000000002'
) ON CONFLICT (aid_code) DO NOTHING;

INSERT INTO knowledge.aid_criteria (
  id, aid_scheme_id, criterion_type, operator, value_json,
  is_required, source_text, criterion_version
) VALUES (
  'f0000000-0000-4000-8000-00000000000c',
  'f0000000-0000-4000-8000-00000000000b',
  'annual_income',
  'lte',
  '{"amount":300000,"currency":"INR","synthetic":true}'::jsonb,
  true,
  '[MOCK] Annual household income must not exceed INR 300,000.',
  'mock-v1'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
