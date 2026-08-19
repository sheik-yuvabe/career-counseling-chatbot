import {
  HandoffPacketSchema,
  SafetyDecisionSchema,
  type HandoffPacket,
  type SafetyDecision,
} from "@yuvanext/contracts";
import type {
  RequestHandoffInput,
  SafetyChecker,
  SafetyPreCheckInput,
} from "../../application/index.js";

export class FixtureSafetyChecker implements SafetyChecker {
  private readonly decision: SafetyDecision;
  private readonly handoff: HandoffPacket;

  constructor(decision: SafetyDecision, handoff: HandoffPacket) {
    this.decision = SafetyDecisionSchema.parse(decision);
    this.handoff = HandoffPacketSchema.parse(handoff);
  }

  preCheck(input: SafetyPreCheckInput): Promise<SafetyDecision> {
    void input;
    return Promise.resolve(this.decision);
  }

  requestHandoff(input: RequestHandoffInput): Promise<HandoffPacket> {
    void input;
    return Promise.resolve(this.handoff);
  }
}
