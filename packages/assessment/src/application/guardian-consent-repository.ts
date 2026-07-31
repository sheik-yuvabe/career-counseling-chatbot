import type { GuardianConsent } from "@yuvanext/contracts";

export type NewGuardianConsent = {
  id: string;
  userId: string;
  guardianPhoneHash: string;
  guardianPhoneLast4: string;
  status: "pending";
  textVersion: string;
  providerReferenceHash: string;
  now: string;
};

export type GuardianConsentRepository = {
  createPending(input: NewGuardianConsent): Promise<GuardianConsent>;
  findByIdForUser(input: { consentId: string; userId: string }): Promise<GuardianConsent | null>;
  findLatestForUser(userId: string): Promise<GuardianConsent | null>;
  hasGrantedForUser(userId: string): Promise<boolean>;
  grant(input: { consentId: string; userId: string; now: string }): Promise<GuardianConsent>;
  expire(input: { consentId: string; userId: string; now: string }): Promise<GuardianConsent>;
};
