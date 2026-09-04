import { readFileSync } from 'fs';
import { join } from 'path';
import pool from './db.js';

const MIGRATION_FILES = [
  '000_custom_auth_pg.sql',
  '002_event_program_indexes_and_validations.sql',
  '003_admin_requests.sql',
];

const SEED_FILE = 'seed.sql';

async function ensureMigrationTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function isApplied(filename: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM public._schema_migrations WHERE filename = $1',
    [filename],
  );
  return result.rows.length > 0;
}

async function markApplied(filename: string): Promise<void> {
  await pool.query(
    'INSERT INTO public._schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename],
  );
}

export async function runMigrations(): Promise<void> {
  const root = join(import.meta.dirname, '..', '..', '..');

  await ensureMigrationTable();

  for (const file of MIGRATION_FILES) {
    if (await isApplied(file)) {
      console.log(`  ${file} already applied — skipping.`);
      continue;
    }
    const sql = readFileSync(join(root, 'supabase', 'migrations', file), 'utf8').replace(/^\uFEFF/, '');
    console.log(`  Running ${file}...`);
    try {
      await pool.query(sql);
      await markApplied(file);
      console.log(`  ${file} done.`);
    } catch (e: any) {
      console.error(`  ${file} failed: ${e.message}`);
      throw e;
    }
  }

  const profileCount = await pool.query('SELECT count(*) FROM profiles');
  if (parseInt(profileCount.rows[0].count) === 0) {
    const seedPath = join(root, 'supabase', SEED_FILE);
    const seedSql = readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '');
    console.log('Profiles table empty — running seed.sql...');
    await pool.query(seedSql);
    console.log('Seed complete.');
  } else {
    console.log(`Profiles table has ${profileCount.rows[0].count} rows — skipping seed.`);
  }
}
