import { readFileSync } from 'fs';
import { join } from 'path';
import pool from './db.js';

const MIGRATION_FILES = [
  '000_custom_auth_pg.sql',
  '001_init_schema.sql',
  '002_event_program_indexes_and_validations.sql',
  '003_admin_requests.sql',
];

const SEED_FILE = 'seed.sql';

async function tableExists(name: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
    [name],
  );
  return result.rows.length > 0;
}

export async function runMigrations(): Promise<void> {
  const hasProfiles = await tableExists('profiles');
  if (hasProfiles) {
    console.log('Database already initialized — skipping migrations.');
    return;
  }

  console.log('Database not initialized — running migrations...');

  const root = join(import.meta.dirname, '..', '..', '..');

  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(root, 'supabase', 'migrations', file), 'utf8').replace(/^\uFEFF/, '');
    console.log(`  Running ${file}...`);
    await pool.query(sql);
  }

  const seedPath = join(root, 'supabase', SEED_FILE);
  const seedSql = readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '');
  console.log('  Running seed.sql...');
  await pool.query(seedSql);

  console.log('Database initialized successfully.');
}
