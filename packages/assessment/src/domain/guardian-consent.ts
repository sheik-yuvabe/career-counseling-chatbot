import { createHash, randomInt } from "node:crypto";

export const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return `+${digits}`;
};

export const phoneLast4 = (normalizedPhone: string): string => normalizedPhone.slice(-4);

export const protectedPhoneHash = (normalizedPhone: string): string =>
  createHash("sha256").update(`guardian-phone:v1:${normalizedPhone}`).digest("hex");

export const providerReferenceHash = (consentId: string): string =>
  createHash("sha256").update(`guardian-provider-reference:v1:${consentId}`).digest("hex");

export const createGuardianOtp = (): string => randomInt(0, 1_000_000).toString().padStart(6, "0");

export const isMinorAge = (ageAtOnboarding: number): boolean => ageAtOnboarding < 18;

export const createGuardianOtpExpiration = (now: Date): Date => {
  const expiresAt = new Date(now);
  expiresAt.setUTCMinutes(expiresAt.getUTCMinutes() + 5);
  return expiresAt;
};
