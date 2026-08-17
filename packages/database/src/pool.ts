import { Pool, type PoolClient, type PoolConfig } from "pg";

export type DatabasePoolOptions = {
  connectionString: string;
  ssl: boolean;
  max?: number;
  connectionTimeoutMillis?: number;
};

export const createDatabasePool = (options: DatabasePoolOptions): Pool => {
  const config: PoolConfig = {
    connectionString: options.connectionString,
    max: options.max ?? 10,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 10_000,
    ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
  };
  return new Pool(config);
};

export const withTransaction = async <T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};
