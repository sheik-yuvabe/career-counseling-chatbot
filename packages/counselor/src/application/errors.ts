export class CounselorNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounselorNotFoundError";
  }
}

export class CounselorContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounselorContractError";
  }
}

export class CounselorConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounselorConflictError";
  }
}

export class CounselorAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounselorAccessError";
  }
}

export class CounselorDependencyUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounselorDependencyUnavailableError";
  }
}
