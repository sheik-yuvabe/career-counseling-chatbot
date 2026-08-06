import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(scriptDir, "../../../.env"),
  resolve(scriptDir, "../../.env"),
];
const envPath = envCandidates.find((candidate) => existsSync(candidate));
if (envPath) {
  process.loadEnvFile(envPath);
}

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
const runId = process.env.ASSESSMENT_RUN_ID;
const userId = process.env.YUVANEXT_USER_ID;
const answerMode = process.env.ANSWER_MODE ?? "random";

if (!runId) {
  throw new Error("ASSESSMENT_RUN_ID is required.");
}

if (!userId) {
  throw new Error("YUVANEXT_USER_ID is required.");
}

type AssessmentItem = {
  id: string;
  itemKey: string;
  displayOrder: number;
  scaleCode: "R" | "I" | "A" | "S" | "E" | "C" | null;
};

type NextResponse = {
  progress: {
    answered: number;
    total: number;
    isComplete: boolean;
  };
  items: AssessmentItem[];
};

const headers = {
  accept: "application/json",
  "content-type": "application/json",
  "x-yuvanext-user-id": userId,
};

const responseByScale: Record<string, number> = {
  R: 5,
  I: 4,
  A: 3,
  S: 2,
  E: 1,
  C: 1,
};

const chooseResponseValue = (item: AssessmentItem): number => {
  if (answerMode === "pattern") {
    return item.scaleCode ? responseByScale[item.scaleCode] ?? 3 : 3;
  }
  return Math.floor(Math.random() * 5) + 1;
};

const requestJson = async <ResponseBody>(
  path: string,
  init?: RequestInit,
): Promise<ResponseBody> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  return response.json() as Promise<ResponseBody>;
};

while (true) {
  const next = await requestJson<NextResponse>(`/api/v1/assessment-runs/${runId}/next`);
  console.log(`Progress: ${next.progress.answered}/${next.progress.total}`);

  if (next.progress.isComplete || next.items.length === 0) {
    break;
  }

  for (const item of next.items) {
    const responseValue = chooseResponseValue(item);
    await requestJson(`/api/v1/assessment-runs/${runId}/responses`, {
      method: "PUT",
      body: JSON.stringify({
        itemId: item.id,
        responseValue,
        latencyMs: Math.floor(Math.random() * 2_000) + 500,
        answeredAt: new Date().toISOString(),
      }),
    });
    console.log(`Answered ${item.displayOrder}. ${item.itemKey} = ${responseValue}`);
  }
}

const finalNext = await requestJson<NextResponse>(`/api/v1/assessment-runs/${runId}/next`);
console.log(`Completed: ${finalNext.progress.answered}/${finalNext.progress.total}`);

export {};
