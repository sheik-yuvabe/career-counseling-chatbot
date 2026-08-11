-- Locally reviewed YuvaNext crosswalk between official O*NET careers and
-- official TNDCE undergraduate programme listings captured on 2026-08-05.
-- A relationship is guidance only; it is not an admission or eligibility guarantee.

BEGIN;

INSERT INTO knowledge.knowledge_sources (
  id, source_key, name, source_type, base_url, publisher, license_ref,
  trust_level, status, created_at, updated_at
) VALUES (
  'e5000000-0000-4000-8000-999999999991',
  'yuvanext-tn-dce-career-pathway-crosswalk',
  'YuvaNext reviewed O*NET-to-TNDCE pathway crosswalk',
  'manual_review',
  'https://tndce.tn.gov.in/',
  'YuvaNext POC team',
  'Derived crosswalk; verify current programme and professional-entry requirements',
  'project_reviewed',
  'active',
  '2026-08-06T00:00:00Z',
  '2026-08-06T00:00:00Z'
)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  license_ref = EXCLUDED.license_ref,
  trust_level = EXCLUDED.trust_level,
  updated_at = EXCLUDED.updated_at;

INSERT INTO knowledge.dataset_versions (
  id, source_id, dataset_key, version, checksum, record_count, import_status,
  validation_report_json, imported_at, published_at, created_by
) VALUES (
  'e5000000-0000-4000-8000-999999999992',
  'e5000000-0000-4000-8000-999999999991',
  'tn-dce-career-pathway-crosswalk',
  '2026-08-06',
  '119f6cef9d63ddfb7ce7986d1027f70e127336b545d1ae5d317efae28279a5e9',
  33,
  'published',
  '{"status":"approved","pathways":7,"careerMappings":16,"disciplineMappings":10,"careerSource":"O*NET 30.4","programmeSource":"TNDCE captured 2026-08-05","caveat":"Guidance mapping only; professional and admission requirements must be confirmed"}'::jsonb,
  '2026-08-06T00:00:00Z',
  '2026-08-06T00:00:00Z',
  NULL
)
ON CONFLICT (dataset_key, version) DO UPDATE SET
  checksum = EXCLUDED.checksum,
  record_count = EXCLUDED.record_count,
  validation_report_json = EXCLUDED.validation_report_json;

INSERT INTO knowledge.education_routes (
  id, route_code, title, route_level, description, publication_status
) VALUES (
  'e5000000-0000-4000-8000-999999999993',
  'tn-undergraduate-degree',
  'Tamil Nadu Undergraduate Degree Route',
  'degree',
  'An undergraduate degree route represented by programmes listed by the Tamil Nadu Directorate of Collegiate Education.',
  'published'
)
ON CONFLICT (route_code) DO UPDATE SET
  title = EXCLUDED.title,
  route_level = EXCLUDED.route_level,
  description = EXCLUDED.description,
  publication_status = EXCLUDED.publication_status;

WITH pathway_data(id, pathway_code, title, description, duration_band, backup_route_note) AS (VALUES
  ('e5100000-0000-4000-8000-000000000001'::uuid, 'tn-bsc-botany', 'B.Sc Botany', 'Undergraduate study of plant science represented by an official TNDCE programme listing.', 'Typically 3 years; confirm with institution', 'Related life-science routes may be considered after checking current programme requirements.'),
  ('e5100000-0000-4000-8000-000000000002'::uuid, 'tn-ba-history', 'B.A History', 'Undergraduate study of history represented by official TNDCE programme listings.', 'Typically 3 years; confirm with institution', 'Teaching and other regulated roles require their own additional qualifications.'),
  ('e5100000-0000-4000-8000-000000000003'::uuid, 'tn-bcom-general', 'B.Com General', 'Undergraduate commerce study represented by official TNDCE programme listings.', 'Typically 3 years; confirm with institution', 'Professional credentials may be required for specific accounting and finance roles.'),
  ('e5100000-0000-4000-8000-000000000004'::uuid, 'tn-bsc-zoology', 'B.Sc Zoology', 'Undergraduate animal and life-science study represented by official TNDCE programme listings.', 'Typically 3 years; confirm with institution', 'Laboratory and clinical roles may require specialised postgraduate or professional qualifications.'),
  ('e5100000-0000-4000-8000-000000000005'::uuid, 'tn-bsc-physics', 'B.Sc Physics', 'Undergraduate physics study represented by an official TNDCE programme listing.', 'Typically 3 years; confirm with institution', 'Engineering and teaching roles require the applicable professional or teacher-education qualification.'),
  ('e5100000-0000-4000-8000-000000000006'::uuid, 'tn-bba', 'B.B.A Business Administration', 'Undergraduate business-administration study represented by an official TNDCE programme listing.', 'Typically 3 years; confirm with institution', 'Industry-specific roles may require experience or additional qualifications.'),
  ('e5100000-0000-4000-8000-000000000007'::uuid, 'tn-ba-tamil-literature', 'B.A Tamil Literature', 'Undergraduate Tamil literature study represented by an official TNDCE programme listing.', 'Typically 3 years; confirm with institution', 'Teaching roles require the applicable teacher-education qualification.')
)
INSERT INTO knowledge.pathways (
  id, pathway_code, title, description, education_route_id, duration_band,
  backup_route_note, publication_status, dataset_version_id
)
SELECT id, pathway_code, title, description,
       'e5000000-0000-4000-8000-999999999993', duration_band,
       backup_route_note, 'published',
       'e5000000-0000-4000-8000-999999999992'
FROM pathway_data
ON CONFLICT (pathway_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  education_route_id = EXCLUDED.education_route_id,
  duration_band = EXCLUDED.duration_band,
  backup_route_note = EXCLUDED.backup_route_note,
  publication_status = EXCLUDED.publication_status,
  dataset_version_id = EXCLUDED.dataset_version_id;

WITH mapping(onet_code, pathway_id, relationship_type, display_order) AS (VALUES
  ('19-2041.00', 'e5100000-0000-4000-8000-000000000001'::uuid, 'related', 1),
  ('19-1022.00', 'e5100000-0000-4000-8000-000000000001'::uuid, 'foundation', 2),
  ('25-2031.00', 'e5100000-0000-4000-8000-000000000002'::uuid, 'related', 1),
  ('27-3043.00', 'e5100000-0000-4000-8000-000000000002'::uuid, 'foundation', 1),
  ('13-2011.00', 'e5100000-0000-4000-8000-000000000003'::uuid, 'primary', 1),
  ('13-2051.00', 'e5100000-0000-4000-8000-000000000003'::uuid, 'related', 1),
  ('13-1081.00', 'e5100000-0000-4000-8000-000000000003'::uuid, 'related', 1),
  ('19-1022.00', 'e5100000-0000-4000-8000-000000000004'::uuid, 'related', 1),
  ('29-2011.00', 'e5100000-0000-4000-8000-000000000004'::uuid, 'foundation', 1),
  ('25-2031.00', 'e5100000-0000-4000-8000-000000000005'::uuid, 'related', 2),
  ('15-2051.00', 'e5100000-0000-4000-8000-000000000005'::uuid, 'foundation', 1),
  ('13-1081.00', 'e5100000-0000-4000-8000-000000000006'::uuid, 'related', 2),
  ('11-3071.00', 'e5100000-0000-4000-8000-000000000006'::uuid, 'related', 1),
  ('11-9081.00', 'e5100000-0000-4000-8000-000000000006'::uuid, 'related', 1),
  ('27-3043.00', 'e5100000-0000-4000-8000-000000000007'::uuid, 'primary', 2),
  ('25-2031.00', 'e5100000-0000-4000-8000-000000000007'::uuid, 'related', 3)
)
INSERT INTO knowledge.career_pathways (
  career_id, pathway_id, relationship_type, display_order
)
SELECT career.id, mapping.pathway_id, mapping.relationship_type, mapping.display_order
FROM mapping
JOIN knowledge.careers career ON career.onet_code = mapping.onet_code
ON CONFLICT (career_id, pathway_id) DO UPDATE SET
  relationship_type = EXCLUDED.relationship_type,
  display_order = EXCLUDED.display_order;

WITH mapping(pathway_id, discipline_id, relevance_weight) AS (VALUES
  ('e5100000-0000-4000-8000-000000000001'::uuid, 'd2000000-0000-4000-8000-000000000001'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000002'::uuid, 'd2000000-0000-4000-8000-000000000002'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000002'::uuid, 'd2000000-0000-4000-8000-000000000005'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000003'::uuid, 'd2000000-0000-4000-8000-000000000003'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000003'::uuid, 'd2000000-0000-4000-8000-000000000008'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000004'::uuid, 'd2000000-0000-4000-8000-000000000004'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000004'::uuid, 'd2000000-0000-4000-8000-000000000006'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000005'::uuid, 'd2000000-0000-4000-8000-000000000007'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000006'::uuid, 'd2000000-0000-4000-8000-000000000009'::uuid, 1.00000),
  ('e5100000-0000-4000-8000-000000000007'::uuid, 'd2000000-0000-4000-8000-000000000010'::uuid, 1.00000)
)
INSERT INTO knowledge.pathway_disciplines (
  pathway_id, discipline_id, relevance_weight, mapping_version
)
SELECT pathway_id, discipline_id, relevance_weight, 'tn-dce-2026-08-06'
FROM mapping
ON CONFLICT (pathway_id, discipline_id) DO UPDATE SET
  relevance_weight = EXCLUDED.relevance_weight,
  mapping_version = EXCLUDED.mapping_version;

COMMIT;
