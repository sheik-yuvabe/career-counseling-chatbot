export class AssessmentApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export const journeySessionNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("journey_session_not_found", "Journey session was not found.", 404);

export const journeySessionExpired = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "journey_session_expired",
    "Journey session has expired and cannot be resumed.",
    409,
  );

export const journeySessionNotResumable = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "journey_session_not_resumable",
    "Journey session is not in a resumable state.",
    409,
  );

export const userProfileNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("user_profile_not_found", "User profile was not found.", 404);

export const under12Ineligible = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "under_12_ineligible",
    "Students under 12 cannot create a profile in Phase A.",
    422,
  );

export const invalidDateOfBirth = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "invalid_date_of_birth",
    "Date of birth must be a real past date.",
    400,
  );

export const intakeQuestionSetNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "intake_question_set_not_found",
    "No approved intake question set was found for this profile segment.",
    404,
  );

export const intakeQuestionNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("intake_question_not_found", "Intake question was not found.", 404);

export const invalidIntakeAnswer = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "invalid_intake_answer",
    "Intake answer does not match the question response type or allowed options.",
    400,
  );

export const guardianConsentRequired = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "guardian_consent_required",
    "Guardian consent is required before storing minor intake answers.",
    409,
  );

export const guardianConsentNotRequired = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "guardian_consent_not_required",
    "Guardian consent is required only for minor student profiles.",
    409,
  );

export const guardianPhoneMatchesStudent = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "guardian_phone_matches_student",
    "Guardian phone must be different from student phone.",
    400,
  );

export const guardianConsentNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("guardian_consent_not_found", "Guardian consent was not found.", 404);

export const guardianConsentNotPending = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "guardian_consent_not_pending",
    "Only pending guardian consent can be verified.",
    409,
  );

export const invalidGuardianOtp = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "invalid_guardian_otp",
    "Guardian verification code is invalid or expired.",
    400,
  );

export const assessmentVersionNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("assessment_version_not_found", "No active assessment version was found.", 404);

export const assessmentRunNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("assessment_run_not_found", "Assessment run was not found.", 404);

export const assessmentRunNotActive = (): AssessmentApplicationError =>
  new AssessmentApplicationError("assessment_run_not_active", "Assessment run is not active.", 409);

export const assessmentItemNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("assessment_item_not_found", "Assessment item was not found for this run.", 404);

export const invalidAssessmentResponse = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "invalid_assessment_response",
    "Assessment response does not match the item type or options.",
    400,
  );

export const assessmentRunIncomplete = (): AssessmentApplicationError =>
  new AssessmentApplicationError(
    "assessment_run_incomplete",
    "Assessment run must have all required responses before scoring.",
    409,
  );

export const assessmentResultNotFound = (): AssessmentApplicationError =>
  new AssessmentApplicationError("assessment_result_not_found", "Assessment result was not found.", 404);
