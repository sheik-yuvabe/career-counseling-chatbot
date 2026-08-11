BEGIN;

-- Source: Tamil Nadu Directorate of Collegiate Education scholarship directory,
-- locally captured in data/raw/tamil-nadu/tndce/2026-08-05/scholarships.html (row 16).
INSERT INTO knowledge.aid_schemes (
  id,
  aid_code,
  name,
  provider_type,
  provider,
  level,
  states,
  eligibility_summary,
  benefit_summary,
  amount_text,
  application_url,
  portal_name,
  apply_window_start,
  apply_window_end,
  verification_status,
  last_verified_at,
  dataset_version_id
) VALUES (
  'd4000000-0000-4000-8000-000000000011',
  'TN-DCE-16',
  'Chief Minister Research Fellowship',
  'government',
  'Directorate of Collegiate Education, Government of Tamil Nadu',
  'phd',
  ARRAY['Tamil Nadu'],
  'Regular Ph.D. scholars studying in government or government-aided colleges and universities.',
  'The official directory references G.O. No. 53, Higher Education (G1) Department, dated 27 February 2023, and 180 scholars per year.',
  NULL,
  'https://tndce.tn.gov.in/assets/uploads/scholarship/17486062314793G_o_53_and_175_amandment.pdf',
  'Teachers Recruitment Board examination portal',
  NULL,
  NULL,
  'verified',
  '2026-08-05T00:00:00Z',
  'd1000000-0000-4000-8000-999999999994'
)
ON CONFLICT (aid_code) DO UPDATE SET
  name = EXCLUDED.name,
  provider_type = EXCLUDED.provider_type,
  provider = EXCLUDED.provider,
  level = EXCLUDED.level,
  states = EXCLUDED.states,
  eligibility_summary = EXCLUDED.eligibility_summary,
  benefit_summary = EXCLUDED.benefit_summary,
  amount_text = EXCLUDED.amount_text,
  application_url = EXCLUDED.application_url,
  portal_name = EXCLUDED.portal_name,
  verification_status = EXCLUDED.verification_status,
  last_verified_at = EXCLUDED.last_verified_at,
  dataset_version_id = EXCLUDED.dataset_version_id;

INSERT INTO knowledge.aid_criteria (
  id,
  aid_scheme_id,
  criterion_type,
  operator,
  value_json,
  is_required,
  source_text,
  criterion_version
) VALUES (
  'd5000000-0000-4000-8000-000000000011',
  'd4000000-0000-4000-8000-000000000011',
  'official_eligibility_text',
  'manual_review',
  '{"sourceListNumber":16}'::jsonb,
  TRUE,
  'Ph.D. Regular in College Govt/Aided and University',
  'tn-dce-2026-08-05'
)
ON CONFLICT (id) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  source_text = EXCLUDED.source_text,
  criterion_version = EXCLUDED.criterion_version;

COMMIT;
