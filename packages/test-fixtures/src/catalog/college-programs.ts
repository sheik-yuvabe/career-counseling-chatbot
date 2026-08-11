export const disciplineFixtures = [
  {
    id: "c1111111-1111-4111-8111-111111111111",
    disciplineCode: "computing",
    title: "Computing and Data",
    domainCode: "technology",
    status: "active",
  },
  {
    id: "c2222222-2222-4222-8222-222222222222",
    disciplineCode: "electrical",
    title: "Electrical Trades",
    domainCode: "skilled-trades",
    status: "active",
  },
] as const;

export const collegeProgramFixtures = [
  {
    id: "c3333333-3333-4333-8333-333333333333",
    collegeId: "11111111-1111-4111-8111-111111111111",
    disciplineId: "c1111111-1111-4111-8111-111111111111",
    programName: "BSc Data Science",
    qualificationLevel: "ug",
    durationBand: "3 years",
    admissionRoute: "Institution admission process",
    feesBand: "Confirm with the institution",
    verificationStatus: "verified",
    lastVerifiedAt: "2026-07-01T00:00:00.000Z",
    datasetVersionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  },
] as const;

export const pathwayDisciplineFixtures = [
  {
    pathwayId: "b4444444-4444-4444-8444-444444444444",
    disciplineId: "c1111111-1111-4111-8111-111111111111",
    relevanceWeight: 1,
    mappingVersion: "poc-1",
  },
] as const;
