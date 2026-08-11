-- Generated from the official O*NET 30.0 Work Values JSON file.
-- O*NET EX values use a 1-7 scale and are normalized to this schema's 0-1 range by dividing by 7.
BEGIN;
WITH value_data(onet_code, achievement, independence, recognition, relationships, support, working_conditions) AS (VALUES
  ('17-2051.00', 0.76143, 0.85714, 0.76143, 0.57143, 0.66714, 0.78571),
  ('17-2141.00', 0.76143, 0.76143, 0.81000, 0.66714, 0.66714, 0.73857),
  ('29-1123.00', 0.81000, 0.76143, 0.81000, 0.95286, 0.66714, 0.76143),
  ('29-2011.00', 0.61857, 0.66714, 0.52429, 0.61857, 0.81000, 0.54714),
  ('25-2021.00', 0.81000, 0.76143, 0.61857, 0.90429, 0.71429, 0.71429),
  ('25-2031.00', 0.81000, 0.71429, 0.57143, 1.00000, 0.66714, 0.76143),
  ('13-2011.00', 0.71429, 0.71429, 0.66714, 0.66714, 0.66714, 0.64286),
  ('17-2021.00', 0.76143, 0.81000, 0.66714, 0.47571, 0.52429, 0.81000),
  ('19-2041.00', 0.71429, 0.71429, 0.71429, 0.57143, 0.52429, 0.66714),
  ('47-2111.00', 0.61857, 0.76143, 0.47571, 0.52429, 0.71429, 0.59571),
  ('51-4121.00', 0.35714, 0.40429, 0.35714, 0.45286, 0.69000, 0.45286),
  ('27-1024.00', 0.81000, 0.76143, 0.66714, 0.57143, 0.57143, 0.64286),
  ('27-3043.00', 0.71429, 0.52429, 0.52429, 0.57143, 0.61857, 0.59571),
  ('23-1011.00', 0.85714, 0.85714, 0.90429, 0.57143, 0.61857, 0.85714),
  ('33-2011.00', 0.78571, 0.66714, 0.69000, 0.81000, 0.83286, 0.64286),
  ('19-2031.00', 0.81000, 0.76143, 0.71429, 0.42857, 0.66714, 0.73857),
  ('19-1022.00', 0.71429, 0.71429, 0.76143, 0.61857, 0.57143, 0.66714),
  ('13-1081.00', 0.76143, 0.81000, 0.71429, 0.71429, 0.61857, 0.69000),
  ('11-3071.00', 0.63429, 0.74571, 0.60286, 0.76143, 0.68286, 0.73857),
  ('35-1011.00', 0.71429, 0.85714, 0.76143, 0.66714, 0.52429, 0.64286),
  ('11-9081.00', 0.71429, 0.85714, 0.61857, 1.00000, 0.57143, 0.59571),
  ('21-1021.00', 0.85714, 0.76143, 0.52429, 0.95286, 0.66714, 0.71429),
  ('21-1012.00', 0.76143, 0.66714, 0.66714, 1.00000, 0.52429, 0.71429),
  ('17-1011.00', 0.81000, 0.85714, 0.81000, 0.52429, 0.61857, 0.78571),
  ('11-9021.00', 0.76143, 0.81000, 0.66714, 0.71429, 0.76143, 0.83286),
  ('47-2231.00', 0.57143, 0.47571, 0.42857, 0.42857, 0.57143, 0.50000),
  ('49-9081.00', 0.57143, 0.42857, 0.42857, 0.52429, 0.61857, 0.54714),
  ('49-3023.00', 0.52429, 0.61857, 0.42857, 0.54714, 0.61857, 0.51143),
  ('53-2011.00', 0.81000, 0.90429, 0.81000, 0.71429, 0.90429, 0.83286)
)
INSERT INTO knowledge.career_value_profiles (
  career_id, achievement, independence, recognition, relationships,
  support, working_conditions, profile_version, dataset_version_id
)
SELECT career.id, values.achievement, values.independence, values.recognition,
  values.relationships, values.support, values.working_conditions,
  'onet-30.0-EX-normalized', career.dataset_version_id
FROM value_data values
JOIN knowledge.careers career ON career.onet_code = values.onet_code
WHERE career.publication_status = 'published'
ON CONFLICT (career_id) DO UPDATE SET
  achievement = EXCLUDED.achievement,
  independence = EXCLUDED.independence,
  recognition = EXCLUDED.recognition,
  relationships = EXCLUDED.relationships,
  support = EXCLUDED.support,
  working_conditions = EXCLUDED.working_conditions,
  profile_version = EXCLUDED.profile_version,
  dataset_version_id = EXCLUDED.dataset_version_id;
COMMIT;
