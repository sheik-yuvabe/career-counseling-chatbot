import type { createDatabasePool } from "@yuvanext/database";

type DatabasePool = ReturnType<typeof createDatabasePool>;

export type ReadApprovedSafetyCopyInput = {
  key: string;
  version: string;
  language: "en";
};

export type ApprovedSafetyCopy = ReadApprovedSafetyCopyInput & {
  text: string;
};

type ApprovedSafetyCopyRow = {
  message_key: string;
  policy_version: string;
  language: string;
  content: string;
};

export class PostgresApprovedSafetyCopyReader {
  constructor(private readonly pool: DatabasePool) {}

  async getCopy(input: ReadApprovedSafetyCopyInput): Promise<ApprovedSafetyCopy | null> {
    const result = await this.pool.query<ApprovedSafetyCopyRow>(
      `select
         message.message_key,
         policy.version as policy_version,
         message.language,
         message.content
       from safety_private.approved_safety_messages message
       join safety_private.safety_policy_versions policy
         on policy.id = message.policy_version_id
       where message.message_key = $1
         and policy.version = $2
         and message.language = $3
         and message.status = 'approved'
         and message.content is not null
       limit 1`,
      [input.key, input.version, input.language],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      key: row.message_key,
      version: row.policy_version,
      language: "en",
      text: row.content,
    };
  }
}
