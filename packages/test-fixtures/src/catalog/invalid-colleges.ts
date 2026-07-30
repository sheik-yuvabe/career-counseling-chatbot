const datasetVersionId =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export const badUrlCollegeFixture = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Bad URL College",
  city: "Chennai",
  state: "Tamil Nadu",
  institutionType: "college",
  websiteUrl: "http://unsafe.example/college",
  verificationStatus: "verified",
  lastVerifiedAt: "2026-07-01T00:00:00.000Z",
  datasetVersionId,
} as const;

export const duplicateCollegeFixtures = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Duplicate College One",
    city: "Chennai",
    state: "Tamil Nadu",
    institutionType: "college",
    websiteUrl: "https://example.edu/duplicate-one",
    verificationStatus: "verified",
    lastVerifiedAt: "2026-07-01T00:00:00.000Z",
    datasetVersionId,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Duplicate College Two",
    city: "Madurai",
    state: "Tamil Nadu",
    institutionType: "college",
    websiteUrl: "https://example.edu/duplicate-two",
    verificationStatus: "verified",
    lastVerifiedAt: "2026-07-01T00:00:00.000Z",
    datasetVersionId,
  },
] as const;

export const mismatchedVersionCollegeFixture = {
  id: "77777777-7777-4777-8777-777777777777",
  name: "Wrong Version College",
  city: "Mysuru",
  state: "Karnataka",
  institutionType: "college",
  websiteUrl: "https://example.edu/wrong-version",
  verificationStatus: "verified",
  lastVerifiedAt: "2026-07-01T00:00:00.000Z",
  datasetVersionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
} as const;

export const missingVerificationDateCollegeFixture = {
  id: "88888888-8888-4888-8888-888888888888",
  name: "Undated Verified College",
  city: "Salem",
  state: "Tamil Nadu",
  institutionType: "college",
  websiteUrl: "https://example.edu/undated",
  verificationStatus: "verified",
  lastVerifiedAt: null,
  datasetVersionId,
} as const;
