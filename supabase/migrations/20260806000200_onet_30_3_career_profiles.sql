-- Generated from official O*NET 30.3 Essential Skills JSON.
-- Salary, image and progression fields remain NULL because this source does not support them.
BEGIN;

INSERT INTO knowledge.knowledge_sources (
  id, source_key, name, source_type, base_url, publisher, license_ref,
  trust_level, status, created_at, updated_at
) VALUES (
  'e6000000-0000-4000-8000-999999999991',
  'onet-30-3-essential-skills',
  'O*NET 30.3 Essential Skills',
  'official_download',
  'https://www.onetcenter.org/database.html',
  'U.S. Department of Labor, Employment and Training Administration',
  'CC BY 4.0; attribution required',
  'authoritative_external',
  'active',
  '2026-08-06T00:00:00Z',
  '2026-08-06T00:00:00Z'
)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  license_ref = EXCLUDED.license_ref,
  updated_at = EXCLUDED.updated_at;

INSERT INTO knowledge.dataset_versions (
  id, source_id, dataset_key, version, checksum, record_count, import_status,
  validation_report_json, imported_at, published_at, created_by
) VALUES (
  'e6000000-0000-4000-8000-999999999992',
  'e6000000-0000-4000-8000-999999999991',
  'onet-career-profiles-skills',
  '30.3-reviewed-2026-08-06',
  'e90f2dd63e22f4765fa05fcc834455e52381b2139ab9a0db22c2bf1ab8f3b0fa',
  30,
  'published',
  '{"status":"approved","profiles":30,"skillsPerProfile":5,"selection":"top unsuppressed importance ratings","unavailableExactCodes":["15-2051.00","13-2051.00"],"unsupportedFields":"salary,image,progression remain null"}'::jsonb,
  '2026-08-06T00:00:00Z',
  '2026-08-06T00:00:00Z',
  NULL
)
ON CONFLICT (dataset_key, version) DO UPDATE SET
  checksum = EXCLUDED.checksum,
  record_count = EXCLUDED.record_count,
  validation_report_json = EXCLUDED.validation_report_json;

WITH profile_data(onet_code, skills) AS (VALUES
  ('15-1252.00', ARRAY['Critical Thinking', 'Active Learning', 'Reading Comprehension', 'Active Listening', 'Writing']::text[]),
  ('17-2051.00', ARRAY['Active Listening', 'Critical Thinking', 'Mathematics', 'Reading Comprehension', 'Speaking']::text[]),
  ('17-2141.00', ARRAY['Active Listening', 'Critical Thinking', 'Reading Comprehension', 'Mathematics', 'Science']::text[]),
  ('29-1123.00', ARRAY['Active Listening', 'Critical Thinking', 'Reading Comprehension', 'Speaking', 'Monitoring']::text[]),
  ('29-2011.00', ARRAY['Critical Thinking', 'Science', 'Active Listening', 'Reading Comprehension', 'Monitoring']::text[]),
  ('25-2021.00', ARRAY['Learning Strategies', 'Speaking', 'Active Listening', 'Critical Thinking', 'Monitoring']::text[]),
  ('25-2031.00', ARRAY['Active Listening', 'Learning Strategies', 'Reading Comprehension', 'Speaking', 'Critical Thinking']::text[]),
  ('13-2011.00', ARRAY['Reading Comprehension', 'Active Listening', 'Critical Thinking', 'Speaking', 'Writing']::text[]),
  ('17-2021.00', ARRAY['Active Listening', 'Reading Comprehension', 'Speaking', 'Writing', 'Critical Thinking']::text[]),
  ('19-2041.00', ARRAY['Active Listening', 'Reading Comprehension', 'Science', 'Speaking', 'Writing']::text[]),
  ('47-2111.00', ARRAY['Active Listening', 'Critical Thinking', 'Speaking', 'Active Learning', 'Monitoring']::text[]),
  ('51-4121.00', ARRAY['Monitoring', 'Critical Thinking', 'Active Listening', 'Speaking', 'Reading Comprehension']::text[]),
  ('27-1024.00', ARRAY['Active Listening', 'Speaking', 'Active Learning', 'Critical Thinking', 'Writing']::text[]),
  ('27-3043.00', ARRAY['Writing', 'Reading Comprehension', 'Active Listening', 'Speaking', 'Critical Thinking']::text[]),
  ('23-1011.00', ARRAY['Speaking', 'Active Listening', 'Critical Thinking', 'Reading Comprehension', 'Writing']::text[]),
  ('33-2011.00', ARRAY['Critical Thinking', 'Active Learning', 'Active Listening', 'Monitoring', 'Speaking']::text[]),
  ('19-2031.00', ARRAY['Science', 'Critical Thinking', 'Reading Comprehension', 'Speaking', 'Active Listening']::text[]),
  ('19-1022.00', ARRAY['Science', 'Reading Comprehension', 'Critical Thinking', 'Writing', 'Active Learning']::text[]),
  ('13-1081.00', ARRAY['Critical Thinking', 'Active Listening', 'Monitoring', 'Reading Comprehension', 'Speaking']::text[]),
  ('11-3071.00', ARRAY['Active Listening', 'Reading Comprehension', 'Monitoring', 'Active Learning', 'Critical Thinking']::text[]),
  ('35-1011.00', ARRAY['Monitoring', 'Speaking', 'Critical Thinking', 'Active Listening', 'Reading Comprehension']::text[]),
  ('11-9081.00', ARRAY['Active Listening', 'Speaking', 'Reading Comprehension', 'Writing', 'Active Learning']::text[]),
  ('21-1021.00', ARRAY['Active Listening', 'Speaking', 'Critical Thinking', 'Reading Comprehension', 'Monitoring']::text[]),
  ('21-1012.00', ARRAY['Active Listening', 'Speaking', 'Critical Thinking', 'Reading Comprehension', 'Writing']::text[]),
  ('17-1011.00', ARRAY['Critical Thinking', 'Reading Comprehension', 'Speaking', 'Active Listening', 'Writing']::text[]),
  ('11-9021.00', ARRAY['Active Listening', 'Critical Thinking', 'Active Learning', 'Monitoring', 'Reading Comprehension']::text[]),
  ('47-2231.00', ARRAY['Critical Thinking', 'Active Listening', 'Monitoring', 'Active Learning', 'Reading Comprehension']::text[]),
  ('49-9081.00', ARRAY['Critical Thinking', 'Monitoring', 'Reading Comprehension', 'Active Learning', 'Active Listening']::text[]),
  ('49-3023.00', ARRAY['Critical Thinking', 'Active Listening', 'Monitoring', 'Speaking', 'Reading Comprehension']::text[]),
  ('53-2011.00', ARRAY['Active Listening', 'Critical Thinking', 'Monitoring', 'Reading Comprehension', 'Active Learning']::text[])
)
INSERT INTO knowledge.career_profiles (
  career_id, image_ref, salary_entry_band, salary_note, skills,
  next_role_3yr, progression_note, review_status, last_reviewed_at, reviewed_by
)
SELECT career.id, NULL, NULL, NULL, profile_data.skills,
       NULL, NULL, 'reviewed', '2026-08-06T00:00:00Z', NULL
FROM profile_data
JOIN knowledge.careers career ON career.onet_code = profile_data.onet_code
ON CONFLICT (career_id) DO UPDATE SET
  image_ref = EXCLUDED.image_ref,
  salary_entry_band = EXCLUDED.salary_entry_band,
  salary_note = EXCLUDED.salary_note,
  skills = EXCLUDED.skills,
  next_role_3yr = EXCLUDED.next_role_3yr,
  progression_note = EXCLUDED.progression_note,
  review_status = EXCLUDED.review_status,
  last_reviewed_at = EXCLUDED.last_reviewed_at,
  reviewed_by = EXCLUDED.reviewed_by;

COMMIT;
