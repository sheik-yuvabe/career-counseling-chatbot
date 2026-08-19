import {
  AssistantTurnSchema,
  CounselorToolCallSchema,
  ExplorationEventSchema,
  JourneyStateSchema,
  ReportSnapshotSchema,
  StartConversationRequestSchema,
} from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";
import {
  invalidCounselorFixtures,
  validAssistantTurn,
  validCounselorToolCall,
  validExplorationEvent,
  validJourneyState,
  validReportSnapshot,
  validStartConversationRequest,
} from "../src/index.js";

describe("Module 4 counselor contracts", () => {
  it("parses representative valid fixtures", () => {
    expect(StartConversationRequestSchema.parse(validStartConversationRequest)).toEqual(
      validStartConversationRequest,
    );
    expect(AssistantTurnSchema.parse(validAssistantTurn)).toEqual(validAssistantTurn);
    expect(CounselorToolCallSchema.parse(validCounselorToolCall)).toEqual(validCounselorToolCall);
    expect(ExplorationEventSchema.parse(validExplorationEvent)).toEqual(validExplorationEvent);
    expect(JourneyStateSchema.parse(validJourneyState)).toEqual(validJourneyState);
    expect(ReportSnapshotSchema.parse(validReportSnapshot)).toEqual(validReportSnapshot);
  });

  it("rejects conversation context that must be derived by the server", () => {
    expect(
      StartConversationRequestSchema.safeParse(
        invalidCounselorFixtures.clientSuppliedConversationContext,
      ).success,
    ).toBe(false);
  });

  it("rejects tools outside the approved registry", () => {
    expect(CounselorToolCallSchema.safeParse(invalidCounselorFixtures.unknownTool).success).toBe(
      false,
    );
  });

  it("rejects journey steps outside the five-step journey", () => {
    expect(
      JourneyStateSchema.safeParse(invalidCounselorFixtures.journeyStepOutsidePhaseA).success,
    ).toBe(false);
  });

  it("requires at least one recommendation in a report", () => {
    expect(
      ReportSnapshotSchema.safeParse(invalidCounselorFixtures.reportWithoutRecommendations).success,
    ).toBe(false);
  });
});
