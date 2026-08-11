-- Make synthetic Module 3 fixtures realistic enough for UI/API demonstrations.
-- Provenance, codes and example.com URLs continue to identify them as synthetic;
-- these rows must not be represented as official or production facts.

BEGIN;

WITH data(i, title, domain, description, salary, skills, next_role) AS (
  VALUES
    (1, 'Solar Energy Technician', 'engineering', 'Installs, inspects and maintains rooftop and utility-scale solar energy systems.', 'INR 2.4-4.2 LPA', ARRAY['electrical safety','solar PV systems','fault diagnosis'], 'Senior Solar Technician'),
    (2, 'Electric Vehicle Service Technician', 'engineering', 'Diagnoses and services electric vehicle batteries, motors and electronic control systems.', 'INR 2.6-4.5 LPA', ARRAY['EV diagnostics','battery safety','electrical systems'], 'EV Diagnostic Specialist'),
    (3, 'Data Analyst', 'technology', 'Organises and analyses data to help teams understand performance and make decisions.', 'INR 3.0-6.0 LPA', ARRAY['spreadsheets','SQL','data visualisation'], 'Senior Data Analyst'),
    (4, 'Medical Laboratory Technician', 'healthcare', 'Performs supervised laboratory tests that support diagnosis and patient care.', 'INR 2.2-4.0 LPA', ARRAY['sample handling','laboratory safety','quality control'], 'Senior Laboratory Technician'),
    (5, 'Agricultural Drone Operator', 'technology', 'Operates drones for crop monitoring, mapping and precision agricultural activities.', 'INR 2.5-4.8 LPA', ARRAY['drone operations','crop mapping','field safety'], 'Precision Agriculture Specialist'),
    (6, 'UI and UX Designer', 'design', 'Researches user needs and designs clear interfaces for websites and applications.', 'INR 3.0-6.5 LPA', ARRAY['user research','wireframing','visual design'], 'Product Designer'),
    (7, 'Early Childhood Educator', 'education', 'Plans age-appropriate learning activities and supports young children in foundational development.', 'INR 2.0-3.8 LPA', ARRAY['lesson planning','child development','communication'], 'Academic Coordinator'),
    (8, 'Cybersecurity Support Analyst', 'technology', 'Monitors basic security alerts and helps protect systems, accounts and business information.', 'INR 3.2-6.2 LPA', ARRAY['network fundamentals','incident triage','access control'], 'Security Operations Analyst'),
    (9, 'Physiotherapy Assistant', 'healthcare', 'Supports physiotherapists with guided exercises, equipment preparation and patient records.', 'INR 2.0-3.6 LPA', ARRAY['exercise support','patient communication','clinical hygiene'], 'Senior Therapy Assistant'),
    (10, 'Supply Chain Coordinator', 'engineering', 'Coordinates inventory, suppliers and movement of materials across business operations.', 'INR 2.8-5.0 LPA', ARRAY['inventory planning','vendor coordination','reporting'], 'Supply Chain Analyst')
)
UPDATE knowledge.careers c
SET title = data.title,
    short_description = data.description,
    domain_code = data.domain,
    updated_at = '2026-08-05T00:00:00Z'
FROM data
WHERE c.id = ('f4000000-0000-4000-8000-' || lpad(data.i::text, 12, '0'))::uuid;

WITH data(i, salary, skills, next_role) AS (
  VALUES
    (1, 'INR 2.4-4.2 LPA', ARRAY['electrical safety','solar PV systems','fault diagnosis'], 'Senior Solar Technician'),
    (2, 'INR 2.6-4.5 LPA', ARRAY['EV diagnostics','battery safety','electrical systems'], 'EV Diagnostic Specialist'),
    (3, 'INR 3.0-6.0 LPA', ARRAY['spreadsheets','SQL','data visualisation'], 'Senior Data Analyst'),
    (4, 'INR 2.2-4.0 LPA', ARRAY['sample handling','laboratory safety','quality control'], 'Senior Laboratory Technician'),
    (5, 'INR 2.5-4.8 LPA', ARRAY['drone operations','crop mapping','field safety'], 'Precision Agriculture Specialist'),
    (6, 'INR 3.0-6.5 LPA', ARRAY['user research','wireframing','visual design'], 'Product Designer'),
    (7, 'INR 2.0-3.8 LPA', ARRAY['lesson planning','child development','communication'], 'Academic Coordinator'),
    (8, 'INR 3.2-6.2 LPA', ARRAY['network fundamentals','incident triage','access control'], 'Security Operations Analyst'),
    (9, 'INR 2.0-3.6 LPA', ARRAY['exercise support','patient communication','clinical hygiene'], 'Senior Therapy Assistant'),
    (10, 'INR 2.8-5.0 LPA', ARRAY['inventory planning','vendor coordination','reporting'], 'Supply Chain Analyst')
)
UPDATE knowledge.career_profiles p
SET image_ref = 'https://example.com/assets/careers/' || p.career_id || '.webp',
    salary_entry_band = data.salary,
    salary_note = 'Illustrative India entry-level range for demonstration; verify against current local sources.',
    skills = data.skills,
    next_role_3yr = data.next_role,
    progression_note = 'Illustrative progression after relevant experience and further skill development.'
FROM data
WHERE p.career_id = ('f4000000-0000-4000-8000-' || lpad(data.i::text, 12, '0'))::uuid;

WITH data(i, route_code, title, level, description) AS (
  VALUES
    (1,'SYN-CERT-SOLAR','Certificate in Solar PV Installation','certificate','Short-term technical training in solar installation and maintenance.'),
    (2,'SYN-DIP-EV','Diploma in Electric Vehicle Technology','diploma','Diploma route covering EV electrical, battery and service systems.'),
    (3,'SYN-BSC-DATA','B.Sc. Data Science','undergraduate','Undergraduate route combining statistics, computing and data analysis.'),
    (4,'SYN-DMLT','Diploma in Medical Laboratory Technology','diploma','Allied-health route covering laboratory procedures and supervised practice.'),
    (5,'SYN-CERT-DRONE','Certificate in Drone Operations','certificate','Approved training route for safe drone operation and mapping workflows.'),
    (6,'SYN-BDES-UX','Bachelor of Design','undergraduate','Design route covering research, interaction design and visual communication.'),
    (7,'SYN-DECE','Diploma in Early Childhood Education','diploma','Education route focused on foundational learning and child development.'),
    (8,'SYN-BCA-CYBER','BCA with Cybersecurity','undergraduate','Computing route with networking and introductory cybersecurity.'),
    (9,'SYN-DPTA','Diploma in Physiotherapy Assistance','diploma','Support-level allied-health training with supervised clinical exposure.'),
    (10,'SYN-BBA-SCM','BBA Supply Chain Management','undergraduate','Business route covering operations, logistics and inventory planning.')
)
UPDATE knowledge.education_routes r
SET route_code=data.route_code, title=data.title, route_level=data.level, description=data.description
FROM data
WHERE r.id=('f3000000-0000-4000-8000-' || lpad(data.i::text,12,'0'))::uuid;

WITH data(i, code, title, description, duration) AS (
  VALUES
    (1,'SYN-PATH-SOLAR','Solar PV Installation Pathway','Technical training followed by supervised installation experience.','6-12 months'),
    (2,'SYN-PATH-EV','Electric Vehicle Service Pathway','Diploma study followed by EV workshop practice.','2-3 years'),
    (3,'SYN-PATH-DATA','Data Analytics Pathway','Degree study, portfolio projects and entry-level analytics practice.','3-4 years'),
    (4,'SYN-PATH-LAB','Medical Laboratory Pathway','Laboratory diploma with required practical training.','2-3 years'),
    (5,'SYN-PATH-DRONE','Agricultural Drone Pathway','Drone training combined with agricultural mapping practice.','6-18 months'),
    (6,'SYN-PATH-UX','Digital Product Design Pathway','Design education supported by user-research and interface portfolios.','3-4 years'),
    (7,'SYN-PATH-ECE','Early Childhood Education Pathway','Teacher preparation with classroom observation and practice.','1-3 years'),
    (8,'SYN-PATH-CYBER','Cybersecurity Support Pathway','Computing education, practical labs and foundational certification.','3-4 years'),
    (9,'SYN-PATH-PTA','Physiotherapy Assistance Pathway','Allied-health training with supervised rehabilitation practice.','2-3 years'),
    (10,'SYN-PATH-SCM','Supply Chain Operations Pathway','Business education with logistics and inventory experience.','3-4 years')
)
UPDATE knowledge.pathways p
SET pathway_code=data.code, title=data.title, description=data.description,
    duration_band=data.duration, backup_route_note='Related diploma or certificate routes may also be explored.'
FROM data
WHERE p.id=('f5000000-0000-4000-8000-' || lpad(data.i::text,12,'0'))::uuid;

WITH data(i, code, title, description) AS (
  VALUES
    (1,'SYN-SCI-PCM','Science - PCM','Physics, Chemistry and Mathematics for engineering and quantitative pathways.'),
    (2,'SYN-SCI-PCB','Science - PCB','Physics, Chemistry and Biology for health and life-science pathways.'),
    (3,'SYN-COM-MATH','Commerce with Mathematics','Commerce, accounting, economics and mathematics.'),
    (4,'SYN-COM','Commerce','Commerce, accounting, economics and business studies.'),
    (5,'SYN-HUM','Humanities','Languages, social sciences and humanities subjects.'),
    (6,'SYN-VOC-IT','Vocational - Information Technology','Applied computing and entry-level IT skills.'),
    (7,'SYN-VOC-HEALTH','Vocational - Healthcare','Foundational patient-care and healthcare support skills.'),
    (8,'SYN-VOC-ELEC','Vocational - Electrical Technology','Applied electrical installation and maintenance skills.'),
    (9,'SYN-DESIGN','Creative Arts and Design','Visual communication, creative practice and design foundations.'),
    (10,'SYN-AGRI','Agriculture','Agriculture, crop science and practical farm studies.')
)
UPDATE knowledge.stream_options s
SET stream_code=data.code, title=data.title, description=data.description
FROM data
WHERE s.id=('f6000000-0000-4000-8000-' || lpad(data.i::text,12,'0'))::uuid;

WITH data(i, name, city, kind, admission, fees) AS (
  VALUES
    (1,'Aruvi Institute of Renewable Technology','Chennai','Private Engineering College','State counselling or institute merit','INR 70,000-120,000 per year'),
    (2,'Thendral College of Mobility Engineering','Coimbatore','Private Engineering College','State counselling','INR 80,000-130,000 per year'),
    (3,'Vaigai School of Computing and Analytics','Madurai','Autonomous College','Merit-based admission','INR 55,000-100,000 per year'),
    (4,'Marutham College of Allied Health Sciences','Salem','Private Allied Health College','Merit and eligibility screening','INR 60,000-110,000 per year'),
    (5,'Kurinji Institute of Agricultural Technology','Tiruchirappalli','Private Technical Institute','Institute merit','INR 45,000-90,000 per year'),
    (6,'Nila College of Design and Digital Arts','Chennai','Autonomous College','Portfolio and aptitude review','INR 90,000-160,000 per year'),
    (7,'Mullai College of Education Studies','Erode','Private Education College','Merit-based admission','INR 35,000-70,000 per year'),
    (8,'Tamira Institute of Cyber Technology','Tirunelveli','Private Technology College','Merit-based admission','INR 75,000-125,000 per year'),
    (9,'Ponni College of Rehabilitation Studies','Thanjavur','Private Allied Health College','Merit and eligibility screening','INR 50,000-95,000 per year'),
    (10,'Sangamam School of Business and Logistics','Hosur','Private Business College','Merit-based admission','INR 60,000-110,000 per year')
)
UPDATE knowledge.colleges c
SET external_code='SYN-TN-' || lpad(data.i::text,4,'0'), name=data.name,
    city=data.city, institution_type=data.kind, admission_route=data.admission,
    fees_band=data.fees, website_url='https://example.com/colleges/' || data.i,
    updated_at='2026-08-05T00:00:00Z'
FROM data
WHERE c.id=('f8000000-0000-4000-8000-' || lpad(data.i::text,12,'0'))::uuid;

WITH data(i, code, title, domain, programme) AS (
  VALUES
    (1,'SYN-SOLAR-TECH','Solar Energy Technology','engineering','Diploma in Solar Energy Technology'),
    (2,'SYN-EV-TECH','Electric Vehicle Technology','engineering','Diploma in Electric Vehicle Technology'),
    (3,'SYN-DATA-AN','Data Analytics','technology','B.Sc. Data Analytics'),
    (4,'SYN-MED-LAB','Medical Laboratory Technology','healthcare','B.Sc. Medical Laboratory Technology'),
    (5,'SYN-AGRI-DRONE','Agricultural Drone Technology','technology','Certificate in Agricultural Drone Operations'),
    (6,'SYN-UX-DES','User Experience Design','design','Bachelor of Design in User Experience'),
    (7,'SYN-EARLY-ED','Early Childhood Education','education','Diploma in Early Childhood Education'),
    (8,'SYN-CYBER','Cybersecurity','technology','BCA Cybersecurity'),
    (9,'SYN-PHYSIO-ASST','Physiotherapy Assistance','healthcare','Diploma in Physiotherapy Assistance'),
    (10,'SYN-SUPPLY','Supply Chain Management','engineering','BBA Supply Chain and Logistics')
)
UPDATE knowledge.disciplines d
SET discipline_code=data.code, title=data.title, domain_code=data.domain
FROM data
WHERE d.id=('f9000000-0000-4000-8000-' || lpad(data.i::text,12,'0'))::uuid;

WITH data(i, programme) AS (
  VALUES
    (1,'Diploma in Solar Energy Technology'),(2,'Diploma in Electric Vehicle Technology'),
    (3,'B.Sc. Data Analytics'),(4,'B.Sc. Medical Laboratory Technology'),
    (5,'Certificate in Agricultural Drone Operations'),(6,'Bachelor of Design in User Experience'),
    (7,'Diploma in Early Childhood Education'),(8,'BCA Cybersecurity'),
    (9,'Diploma in Physiotherapy Assistance'),(10,'BBA Supply Chain and Logistics')
)
UPDATE knowledge.college_programs p
SET program_name=data.programme,
    duration_band=CASE WHEN data.i IN (1,2,7,9) THEN '2 years' WHEN data.i=5 THEN '6 months' ELSE '3-4 years' END,
    admission_route='Merit-based admission', fees_band='See the synthetic college fees band'
FROM data
WHERE p.id=('fa000000-0000-4000-8000-' || lpad(data.i::text,12,'0'))::uuid;

WITH data(i, code, name, eligibility, benefit, amount) AS (
  VALUES
    (1,'SYN-SOLAR-SUPPORT','Solar Skills Learner Support','Students enrolled in an eligible solar-technology programme.','Training-fee assistance.','Up to INR 20,000'),
    (2,'SYN-EV-WOMEN','Women in Electric Mobility Grant','Women enrolled in an eligible electric-mobility programme.','Tuition support and mentoring.','Up to INR 30,000'),
    (3,'SYN-RURAL-DATA','Rural Data Learner Scholarship','Eligible rural students pursuing data or computing education.','Course-fee assistance.','Up to INR 25,000'),
    (4,'SYN-ALLIED-HEALTH','Allied Health Education Support','Students pursuing an eligible allied-health programme.','Tuition and learning-material support.','Up to INR 28,000'),
    (5,'SYN-AGRI-INNOVATION','Agriculture Technology Learner Grant','Students taking eligible agriculture-technology training.','Training and equipment support.','Up to INR 18,000'),
    (6,'SYN-CREATIVE-PORTFOLIO','Creative Design Portfolio Grant','Design learners who meet the synthetic income criterion.','Portfolio and course support.','Up to INR 22,000'),
    (7,'SYN-EARLY-ED','Early Educator Preparation Support','Students enrolled in early-childhood education programmes.','Tuition-fee assistance.','Up to INR 16,000'),
    (8,'SYN-CYBER-ACCESS','Cybersecurity Access Scholarship','Eligible students pursuing introductory cybersecurity education.','Course and certification support.','Up to INR 32,000'),
    (9,'SYN-REHAB-STUDY','Rehabilitation Studies Support','Students enrolled in eligible rehabilitation-support programmes.','Tuition and materials assistance.','Up to INR 24,000'),
    (10,'SYN-LOGISTICS','Future Logistics Learner Grant','Students pursuing supply-chain and logistics education.','Course-fee assistance.','Up to INR 20,000')
)
UPDATE knowledge.aid_schemes a
SET aid_code=data.code, name=data.name, provider='YuvaNext Demonstration Foundation',
    eligibility_summary=data.eligibility, benefit_summary=data.benefit,
    amount_text=data.amount, application_url='https://example.com/aid/' || data.i,
    portal_name='Demonstration Scholarship Portal'
FROM data
WHERE a.id=('fb000000-0000-4000-8000-' || lpad(data.i::text,12,'0'))::uuid;

UPDATE knowledge.aid_criteria
SET source_text='Synthetic household-income criterion for demonstration only; not an official eligibility rule.'
WHERE id::text LIKE 'fc000000-0000-4000-8000-%';

UPDATE knowledge.knowledge_sources
SET name='YuvaNext synthetic India knowledge fixture ' || right(id::text, 2),
    publisher='YuvaNext POC - synthetic data only',
    trust_level='synthetic'
WHERE id::text LIKE 'f1000000-0000-4000-8000-%';

COMMIT;
