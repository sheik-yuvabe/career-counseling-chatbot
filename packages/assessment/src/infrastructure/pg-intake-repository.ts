import {
  IntakeAnswerSchema,
  IntakeQuestionSchema,
  type IntakeAnswer,
  type IntakeQuestion,
  type Segment,
} from "@yuvanext/contracts";
import type { Pool } from "pg";
import type {
  IntakeQuestionSetWithQuestions,
  IntakeRepository,
  NewIntakeAnswer,
} from "../application/intake-repository.js";

type IntakeQuestionRow = {
  question_set_id: string;
  segment: Segment;
  version: string;
  language: string;
  question_id: string;
  question_key: string;
  display_order: number;
  prompt_text: string | null;
  response_type: "single_choice" | "multi_choice" | "short_text";
  options_json: unknown;
  is_sensitive: boolean | null;
  is_required: boolean;
};

type IntakeAnswerRow = {
  id: string;
  user_id: string;
  session_id: string;
  question_id: string;
  question_set_version: string;
  answer_json: { value: string | string[] };
  answered_at: Date;
};

const mapQuestionRow = (row: IntakeQuestionRow): IntakeQuestion =>
  IntakeQuestionSchema.parse({
    id: row.question_id,
    questionSetId: row.question_set_id,
    questionSetVersion: row.version,
    segment: row.segment,
    language: row.language,
    questionKey: row.question_key,
    displayOrder: row.display_order,
    promptText: row.prompt_text ?? "",
    responseType: row.response_type,
    options: row.options_json,
    isSensitive: row.is_sensitive ?? false,
    isRequired: row.is_required,
  });

const mapAnswerRow = (row: IntakeAnswerRow): IntakeAnswer =>
  IntakeAnswerSchema.parse({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    questionId: row.question_id,
    questionSetVersion: row.question_set_version,
    answer: row.answer_json,
    answeredAt: row.answered_at.toISOString(),
  });

export class PgIntakeRepository implements IntakeRepository {
  constructor(private readonly pool: Pool) {}

  async findApprovedQuestionSet(input: {
    segment: Segment;
    language: string;
    now: string;
  }): Promise<IntakeQuestionSetWithQuestions | null> {
    const result = await this.pool.query<IntakeQuestionRow>(
      `
        select
          iqs.id as question_set_id,
          iqs.segment,
          iqs.version,
          iqs.language,
          iq.id as question_id,
          iq.question_key,
          iq.display_order,
          iq.prompt_text,
          iq.response_type,
          iq.options_json,
          iq.is_sensitive,
          iq.is_required
        from assessment.intake_question_sets iqs
        join assessment.intake_questions iq on iq.question_set_id = iqs.id
        where iqs.segment = $1
          and iqs.language = $2
          and iqs.status = 'approved'
          and iqs.effective_from <= $3
          and (iqs.retired_at is null or iqs.retired_at > $3)
        order by iqs.effective_from desc, iq.display_order asc
      `,
      [input.segment, input.language, input.now],
    );

    const first = result.rows[0];
    if (!first) {
      return null;
    }

    return {
      questionSet: {
        id: first.question_set_id,
        segment: first.segment,
        version: first.version,
        language: first.language,
      },
      questions: result.rows
        .filter((row) => row.question_set_id === first.question_set_id)
        .map(mapQuestionRow),
    };
  }

  async findQuestionForProfileSegment(input: {
    questionId: string;
    segment: Segment;
    language: string;
    now: string;
  }): Promise<IntakeQuestion | null> {
    const result = await this.pool.query<IntakeQuestionRow>(
      `
        select
          iqs.id as question_set_id,
          iqs.segment,
          iqs.version,
          iqs.language,
          iq.id as question_id,
          iq.question_key,
          iq.display_order,
          iq.prompt_text,
          iq.response_type,
          iq.options_json,
          iq.is_sensitive,
          iq.is_required
        from assessment.intake_question_sets iqs
        join assessment.intake_questions iq on iq.question_set_id = iqs.id
        where iq.id = $1
          and iqs.segment = $2
          and iqs.language = $3
          and iqs.status = 'approved'
          and iqs.effective_from <= $4
          and (iqs.retired_at is null or iqs.retired_at > $4)
        limit 1
      `,
      [input.questionId, input.segment, input.language, input.now],
    );

    const row = result.rows[0];
    return row ? mapQuestionRow(row) : null;
  }

  async upsertAnswer(input: NewIntakeAnswer): Promise<IntakeAnswer> {
    const result = await this.pool.query<IntakeAnswerRow>(
      `
        insert into assessment.intake_answers (
          id,
          user_id,
          session_id,
          question_id,
          question_set_version,
          answer_json,
          answered_at
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id, session_id, question_id) do update set
          question_set_version = excluded.question_set_version,
          answer_json = excluded.answer_json,
          answered_at = excluded.answered_at
        returning *
      `,
      [
        input.id,
        input.userId,
        input.sessionId,
        input.questionId,
        input.questionSetVersion,
        input.answer,
        input.answeredAt,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Intake answer upsert returned no row.");
    }
    return mapAnswerRow(row);
  }
}
