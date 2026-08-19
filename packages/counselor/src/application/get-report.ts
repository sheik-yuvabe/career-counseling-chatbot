import { ReportResponseSchema, UuidSchema, type ReportResponse } from "@yuvanext/contracts";
import { CounselorNotFoundError } from "./errors.js";
import type { CounselorRepository } from "./ports/index.js";

export type GetReportCommand = {
  userId: string;
  reportId: string;
};

export class GetReportService {
  constructor(private readonly repository: CounselorRepository) {}

  async execute(command: GetReportCommand): Promise<ReportResponse> {
    const userId = UuidSchema.parse(command.userId);
    const reportId = UuidSchema.parse(command.reportId);
    const report = await this.repository.findReport(userId, reportId);
    if (!report) {
      throw new CounselorNotFoundError("Report was not found");
    }
    return ReportResponseSchema.parse({ report });
  }
}
