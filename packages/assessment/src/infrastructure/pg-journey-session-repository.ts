import type { JourneySession } from "@yuvanext/contracts";
import { JourneySessionSchema } from "@yuvanext/contracts";
import type { Pool } from "pg";
import type {
  JourneySessionRepository,
  NewJourneySession,
} from "../application/journey-session-repository.js";

type JourneySessionRow = {
  id: string;
  user_id: string;
  anonymous_session_id: string | null;
  channel: "web";
  status: "active" | "paused" | "completed" | "expired" | "abandoned";
  started_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  completed_at: Date | null;
};

const mapJourneySessionRow = (row: JourneySessionRow): JourneySession =>
  JourneySessionSchema.parse({
    id: row.id,
    userId: row.user_id,
    anonymousSessionId: row.anonymous_session_id,
    channel: row.channel,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  });

export class PgJourneySessionRepository implements JourneySessionRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: NewJourneySession): Promise<JourneySession> {
    const result = await this.pool.query<JourneySessionRow>(
      `
        insert into assessment.journey_sessions (
          id,
          user_id,
          anonymous_session_id,
          channel,
          status,
          started_at,
          last_seen_at,
          expires_at,
          completed_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning *
      `,
      [
        input.id,
        input.userId,
        input.anonymousSessionId,
        input.channel,
        input.status,
        input.startedAt,
        input.lastSeenAt,
        input.expiresAt,
        input.completedAt,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Journey session insert returned no row.");
    }
    return mapJourneySessionRow(row);
  }

  async findByIdForUser(input: {
    sessionId: string;
    userId: string;
  }): Promise<JourneySession | null> {
    const result = await this.pool.query<JourneySessionRow>(
      `
        select *
        from assessment.journey_sessions
        where id = $1 and user_id = $2
        limit 1
      `,
      [input.sessionId, input.userId],
    );

    const row = result.rows[0];
    return row ? mapJourneySessionRow(row) : null;
  }

  async markExpired(input: {
    sessionId: string;
    userId: string;
    now: string;
  }): Promise<JourneySession> {
    const result = await this.pool.query<JourneySessionRow>(
      `
        update assessment.journey_sessions
        set status = 'expired', last_seen_at = $3
        where id = $1 and user_id = $2
        returning *
      `,
      [input.sessionId, input.userId, input.now],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Journey session expire update returned no row.");
    }
    return mapJourneySessionRow(row);
  }

  async resume(input: {
    sessionId: string;
    userId: string;
    now: string;
    expiresAt: string;
  }): Promise<JourneySession> {
    const result = await this.pool.query<JourneySessionRow>(
      `
        update assessment.journey_sessions
        set status = 'active', last_seen_at = $3, expires_at = $4
        where id = $1 and user_id = $2
        returning *
      `,
      [input.sessionId, input.userId, input.now, input.expiresAt],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Journey session resume update returned no row.");
    }
    return mapJourneySessionRow(row);
  }
}
