import type { ModuleDescriptor } from "@yuvanext/contracts";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { Express } from "express";
import type { Pool } from "pg";
import type { AssessmentRepository } from "./application/assessment-repository.js";
import { AssessmentService } from "./application/assessment-service.js";
import { AssessmentApplicationError } from "./application/errors.js";
import type { GuardianConsentRepository } from "./application/guardian-consent-repository.js";
import { GuardianConsentService } from "./application/guardian-consent-service.js";
import { InMemoryGuardianOtpStore } from "./application/guardian-otp-store.js";
import type { IntakeRepository } from "./application/intake-repository.js";
import { IntakeService } from "./application/intake-service.js";
import { JourneySessionService } from "./application/journey-session-service.js";
import type { JourneySessionRepository } from "./application/journey-session-repository.js";
import type { UserProfileRepository } from "./application/user-profile-repository.js";
import { UserProfileService } from "./application/user-profile-service.js";
import { registerAssessmentWorkflowRoutes } from "./http/assessment-routes.js";
import { registerGuardianConsentRoutes } from "./http/guardian-consent-routes.js";
import { registerIntakeRoutes } from "./http/intake-routes.js";
import { registerJourneySessionRoutes } from "./http/journey-session-routes.js";
import { registerUserProfileRoutes } from "./http/user-profile-routes.js";
import { PgAssessmentRepository } from "./infrastructure/pg-assessment-repository.js";
import { PgGuardianConsentRepository } from "./infrastructure/pg-guardian-consent-repository.js";
import { PgIntakeRepository } from "./infrastructure/pg-intake-repository.js";
import { PgJourneySessionRepository } from "./infrastructure/pg-journey-session-repository.js";
import { PgUserProfileRepository } from "./infrastructure/pg-user-profile-repository.js";

export const assessmentModule: ModuleDescriptor = {
  code: "m1",
  name: "Assessment",
  packageName: "@yuvanext/assessment",
  status: "in_progress",
};

class UnavailableJourneySessionRepository implements JourneySessionRepository {
  private unavailable(): Promise<never> {
    return Promise.reject(
      new AssessmentApplicationError(
        "database_unavailable",
        "Journey session storage is not configured.",
        503,
      ),
    );
  }

  create() {
    return this.unavailable();
  }

  findByIdForUser() {
    return this.unavailable();
  }

  markExpired() {
    return this.unavailable();
  }

  resume() {
    return this.unavailable();
  }
}

class UnavailableUserProfileRepository implements UserProfileRepository {
  private unavailable(): Promise<never> {
    return Promise.reject(
      new AssessmentApplicationError(
        "database_unavailable",
        "User profile storage is not configured.",
        503,
      ),
    );
  }

  upsert() {
    return this.unavailable();
  }

  findByUserId() {
    return this.unavailable();
  }
}

class UnavailableIntakeRepository implements IntakeRepository {
  private unavailable(): Promise<never> {
    return Promise.reject(
      new AssessmentApplicationError(
        "database_unavailable",
        "Intake storage is not configured.",
        503,
      ),
    );
  }

  findApprovedQuestionSet() {
    return this.unavailable();
  }

  findQuestionForProfileSegment() {
    return this.unavailable();
  }

  upsertAnswer() {
    return this.unavailable();
  }
}

class UnavailableGuardianConsentRepository implements GuardianConsentRepository {
  private unavailable(): Promise<never> {
    return Promise.reject(
      new AssessmentApplicationError(
        "database_unavailable",
        "Guardian consent storage is not configured.",
        503,
      ),
    );
  }

  createPending() {
    return this.unavailable();
  }

  findByIdForUser() {
    return this.unavailable();
  }

  findLatestForUser() {
    return this.unavailable();
  }

  hasGrantedForUser() {
    return this.unavailable();
  }

  grant() {
    return this.unavailable();
  }

  expire() {
    return this.unavailable();
  }
}

class UnavailableAssessmentRepository implements AssessmentRepository {
  private unavailable(): Promise<never> {
    return Promise.reject(
      new AssessmentApplicationError(
        "database_unavailable",
        "Assessment storage is not configured.",
        503,
      ),
    );
  }

  findActiveVersion() { return this.unavailable(); }
  createRun() { return this.unavailable(); }
  findRunByIdForUser() { return this.unavailable(); }
  listRunItems() { return this.unavailable(); }
  listAnsweredItemIds() { return this.unavailable(); }
  findItemForRun() { return this.unavailable(); }
  findOptionForItem() { return this.unavailable(); }
  upsertResponse() { return this.unavailable(); }
  updateRunProgress() { return this.unavailable(); }
  listScoringResponses() { return this.unavailable(); }
  createResult() { return this.unavailable(); }
  findResultByRunForUser() { return this.unavailable(); }
  findLatestResultByUserForInstrument() { return this.unavailable(); }
  getIntakeSummary() { return this.unavailable(); }
  getNextProfileVersion() { return this.unavailable(); }
  createProfileSnapshot() { return this.unavailable(); }
}

export type RegisterAssessmentRoutesOptions = {
  pool?: Pool;
  assessmentRepository?: AssessmentRepository;
  journeySessionRepository?: JourneySessionRepository;
  userProfileRepository?: UserProfileRepository;
  intakeRepository?: IntakeRepository;
  guardianConsentRepository?: GuardianConsentRepository;
};

export const registerAssessmentRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  options: RegisterAssessmentRoutesOptions = {},
): void => {
  const repository =
    options.journeySessionRepository ??
    (options.pool ? new PgJourneySessionRepository(options.pool) : new UnavailableJourneySessionRepository());
  const userProfileRepository =
    options.userProfileRepository ??
    (options.pool ? new PgUserProfileRepository(options.pool) : new UnavailableUserProfileRepository());
  const intakeRepository =
    options.intakeRepository ??
    (options.pool ? new PgIntakeRepository(options.pool) : new UnavailableIntakeRepository());
  const guardianConsentRepository =
    options.guardianConsentRepository ??
    (options.pool
      ? new PgGuardianConsentRepository(options.pool)
      : new UnavailableGuardianConsentRepository());
  const assessmentRepository =
    options.assessmentRepository ??
    (options.pool ? new PgAssessmentRepository(options.pool) : new UnavailableAssessmentRepository());
  const journeySessionService = new JourneySessionService({ repository });
  const guardianConsentService = new GuardianConsentService({
    guardianConsentRepository,
    journeySessionRepository: repository,
    userProfileRepository,
    otpStore: new InMemoryGuardianOtpStore(),
  });
  const userProfileService = new UserProfileService({
    userProfileRepository,
    journeySessionRepository: repository,
  });
  const intakeService = new IntakeService({
    intakeRepository,
    guardianConsentRepository,
    journeySessionRepository: repository,
    userProfileRepository,
  });
  const assessmentService = new AssessmentService({
    assessmentRepository,
    journeySessionRepository: repository,
    userProfileRepository,
    guardianConsentRepository,
  });
  registerJourneySessionRoutes(app, registry, journeySessionService);
  registerUserProfileRoutes(app, registry, userProfileService);
  registerGuardianConsentRoutes(app, registry, guardianConsentService);
  registerIntakeRoutes(app, registry, intakeService);
  registerAssessmentWorkflowRoutes(app, registry, assessmentService);
};

export { AssessmentService } from "./application/assessment-service.js";
export { GuardianConsentService } from "./application/guardian-consent-service.js";
export { InMemoryGuardianOtpStore } from "./application/guardian-otp-store.js";
export { IntakeService } from "./application/intake-service.js";
export { JourneySessionService } from "./application/journey-session-service.js";
export { UserProfileService } from "./application/user-profile-service.js";
export type {
  AssessmentRepository,
  AssessmentVersionRecord,
  NewAssessmentResponse,
  NewAssessmentRun,
  NewProfileSnapshot,
} from "./application/assessment-repository.js";
export type {
  GuardianConsentRepository,
  NewGuardianConsent,
} from "./application/guardian-consent-repository.js";
export type {
  GuardianOtpChallenge,
  GuardianOtpStore,
} from "./application/guardian-otp-store.js";
export type {
  IntakeQuestionSet,
  IntakeQuestionSetWithQuestions,
  IntakeRepository,
  NewIntakeAnswer,
} from "./application/intake-repository.js";
export type {
  JourneySessionRepository,
  NewJourneySession,
} from "./application/journey-session-repository.js";
export type {
  UpsertUserProfileRecord,
  UserProfileRepository,
} from "./application/user-profile-repository.js";
