export type GuardianOtpChallenge = {
  consentId: string;
  code: string;
  expiresAt: string;
  attempts: number;
};

export type GuardianOtpStore = {
  save(challenge: GuardianOtpChallenge): void;
  get(consentId: string): GuardianOtpChallenge | null;
  recordFailedAttempt(consentId: string): GuardianOtpChallenge | null;
  delete(consentId: string): void;
};

export class InMemoryGuardianOtpStore implements GuardianOtpStore {
  private readonly challenges = new Map<string, GuardianOtpChallenge>();

  save(challenge: GuardianOtpChallenge): void {
    this.challenges.set(challenge.consentId, challenge);
  }

  get(consentId: string): GuardianOtpChallenge | null {
    return this.challenges.get(consentId) ?? null;
  }

  recordFailedAttempt(consentId: string): GuardianOtpChallenge | null {
    const challenge = this.challenges.get(consentId);
    if (!challenge) {
      return null;
    }
    const updated = { ...challenge, attempts: challenge.attempts + 1 };
    this.challenges.set(consentId, updated);
    return updated;
  }

  delete(consentId: string): void {
    this.challenges.delete(consentId);
  }
}
