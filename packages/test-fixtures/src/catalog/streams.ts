export const streamOptionFixtures = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    streamCode: "science-mathematics",
    title: "Science with Mathematics",
    description:
      "Builds foundations in mathematics, science, and analytical problem-solving.",
    status: "active",
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    streamCode: "vocational-technology",
    title: "Vocational Technology",
    description:
      "Develops practical technical skills through applied learning.",
    status: "active",
  },
] as const;

export const streamMapFixtures = [
  {
    id: "a3333333-3333-4333-8333-333333333333",
    topTwoCode: "RI",
    segment: "explorer",
    version: "poc-1",
    datasetVersionId:
      "a4444444-4444-4444-8444-444444444444",
    status: "published",
  },
] as const;

export const streamMapItemFixtures = [
  {
    mapId: "a3333333-3333-4333-8333-333333333333",
    streamOptionId: "a1111111-1111-4111-8111-111111111111",
    rank: 1,
    reasonKey: "ri-analytical-foundation",
  },
  {
    mapId: "a3333333-3333-4333-8333-333333333333",
    streamOptionId: "a2222222-2222-4222-8222-222222222222",
    rank: 2,
    reasonKey: "ri-applied-technical-route",
  },
] as const;
