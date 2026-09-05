import { readFileSync } from 'fs';
import { join } from 'path';
import pool from './db.js';

const MIGRATION_FILES = [
  '000_custom_auth_pg.sql',
  '002_event_program_indexes_and_validations.sql',
  '003_admin_requests.sql',
  '004_fix_program_window_validation.sql',
  '005_add_otp_codes.sql',
  '006_participant_details.sql',
  '007_program_categories_and_judges.sql',
  '008_notifications_gallery_schedule.sql',
  '009_nomination_contact_details.sql',
  '010_remove_test_user.sql',
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

async function detectExistingMigrations(): Promise<void> {
  const hasAppRole = await pool.query(
    "SELECT 1 FROM pg_type WHERE typname = 'app_role'",
  );
  if (hasAppRole.rows.length > 0) {
    await markApplied('000_custom_auth_pg.sql');
  }

  const hasAdminRequests = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_requests'",
  );
  if (hasAdminRequests.rows.length > 0) {
    await markApplied('003_admin_requests.sql');
  }

  const hasEventIndex = await pool.query(
    "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_year_status'",
  );
  if (hasEventIndex.rows.length > 0) {
    await markApplied('002_event_program_indexes_and_validations.sql');
  }
}

export async function runMigrations(): Promise<void> {
  const root = join(import.meta.dirname, '..', '..', '..');

  await ensureMigrationTable();
  await detectExistingMigrations();

  let anyRan = false;

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
      anyRan = true;
    } catch (e: any) {
      console.error(`  ${file} failed: ${e.message}`);
      throw e;
    }
  }

  if (!anyRan) {
    console.log('All migrations already applied.');
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
