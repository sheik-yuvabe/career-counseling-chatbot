import type { AgeBand, EducationStage, Segment } from "@yuvanext/contracts";
import { invalidDateOfBirth } from "../application/errors.js";

export const calculateAgeAtOnboarding = (dateOfBirth: string, now: Date): number => {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  if (!year || !month || !day) {
    throw invalidDateOfBirth();
  }

  const birthDate = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    birthDate.getUTCFullYear() === year &&
    birthDate.getUTCMonth() === month - 1 &&
    birthDate.getUTCDate() === day;

  if (!isRealDate || birthDate.getTime() > now.getTime()) {
    throw invalidDateOfBirth();
  }

  let age = now.getUTCFullYear() - year;
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();
  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }
  return age;
};

export const deriveAgeBand = (age: number): AgeBand => {
  if (age <= 13) {
    return "minor_12_13";
  }
  if (age <= 15) {
    return "minor_14_15";
  }
  if (age <= 17) {
    return "minor_16_17";
  }
  if (age === 18) {
    return "adult_18";
  }
  return "adult_19_plus";
};

const deriveAgeBasedSegment = (age: number): Segment => {
  if (age <= 15) {
    return "explorer";
  }
  if (age <= 18) {
    return "pathfinder";
  }
  return "launcher";
};

export const deriveSegment = (input: { age: number; selfStage: EducationStage }): Segment => {
  switch (input.selfStage) {
    case "school":
      return "explorer";
    case "higher_secondary":
      return "pathfinder";
    case "college":
    case "graduate":
    case "working":
      return "launcher";
    case "other":
      return deriveAgeBasedSegment(input.age);
  }
};
