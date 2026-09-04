import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'ctrcms',
  user: process.env.PGUSER || 'ctrcms',
  password: process.env.PGPASSWORD || 'ctrcms123',
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function execute(text: string, params?: any[]): Promise<void> {
  await pool.query(text, params);
}

export default pool;
