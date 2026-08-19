import {
  HandoffPacketSchema,
  SafetyDecisionSchema,
  type HandoffPacket,
  type SafetyDecision,
} from "@yuvanext/contracts";
import { z } from "zod";
import { CounselorDependencyUnavailableError } from "../application/errors.js";
import type {
  RequestHandoffInput,
  SafetyChecker,
  SafetyPreCheckInput,
} from "../application/index.js";

type Fetch = typeof fetch;

const SafetyCheckResponseSchema = z.object({ decision: SafetyDecisionSchema }).strict();
const HandoffResponseSchema = z.object({ packet: HandoffPacketSchema }).strict();

export type HttpSafetyCheckerOptions = {
  baseUrl: string;
  timeoutMs: number;
  fetch?: Fetch;
};

export class HttpSafetyChecker implements SafetyChecker {
  private readonly fetch: Fetch;

  constructor(private readonly options: HttpSafetyCheckerOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async preCheck(input: SafetyPreCheckInput): Promise<SafetyDecision> {
    const response = await this.post("/api/v1/internal/safety/check", {
      sourceEventId: input.sourceEventId,
      message: input.content,
    });
    return SafetyCheckResponseSchema.parse(response).decision;
  }

  async requestHandoff(input: RequestHandoffInput): Promise<HandoffPacket> {
    return HandoffResponseSchema.parse(
      await this.post("/api/v1/internal/handoffs", {
        idempotencyKey: input.idempotencyKey,
        sourceEventId: input.sourceEventId,
      }),
    ).packet;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    try {
      const response = await this.fetch(new URL(path, this.options.baseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
      if (!response.ok) {
        throw new CounselorDependencyUnavailableError(
          `Safety service returned HTTP ${response.status}.`,
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof CounselorDependencyUnavailableError) throw error;
      throw new CounselorDependencyUnavailableError("Safety service request failed.");
    }
  }
}
