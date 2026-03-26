import path from 'path';
import * as pgTypes from 'pg';

// Parse INT8 (bigint) as JS number — pg returns COUNT(*) as string by default
pgTypes.types.setTypeParser(20, (val: string) => parseInt(val, 10));

export type Params = (string | number | boolean | null | undefined)[];

export interface DbClient {
  readonly dialect: 'sqlite' | 'postgres';
  query<T extends object>(sql: string, params?: Params): Promise<T[]>;
  queryOne<T extends object>(sql: string, params?: Params): Promise<T | null>;
  run(sql: string, params?: Params): Promise<{ rowCount: number }>;
}

// ─── SQL schemas ────────────────────────────────────────────────────────────

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL CHECK(sex IN ('male', 'female', 'other')),
    height_cm REAL NOT NULL,
    weight_kg REAL NOT NULL,
    goal_weight_kg REAL,
    activity_level TEXT NOT NULL CHECK(activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
    primary_goal TEXT NOT NULL CHECK(primary_goal IN ('lose_weight', 'maintain', 'build_muscle')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS food_log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    raw_input TEXT NOT NULL,
    confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    sugar_g REAL NOT NULL,
    fiber_g REAL NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES food_log_entries(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    raw_input TEXT,
    activity_name TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    calories_burned REAL NOT NULL,
    met_value REAL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_lbs REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workout_performances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    exercise_type TEXT NOT NULL CHECK(exercise_type IN ('run', 'lift', 'cardio')),
    distance_miles REAL,
    time_seconds REAL,
    weight_lbs REAL,
    reps INTEGER,
    sets INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

const PG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL CHECK(sex IN ('male', 'female', 'other')),
    height_cm DOUBLE PRECISION NOT NULL,
    weight_kg DOUBLE PRECISION NOT NULL,
    goal_weight_kg DOUBLE PRECISION,
    activity_level TEXT NOT NULL CHECK(activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
    primary_goal TEXT NOT NULL CHECK(primary_goal IN ('lose_weight', 'maintain', 'build_muscle')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS daily_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    calories DOUBLE PRECISION NOT NULL,
    protein_g DOUBLE PRECISION NOT NULL,
    carbs_g DOUBLE PRECISION NOT NULL,
    fat_g DOUBLE PRECISION NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS food_log_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    raw_input TEXT NOT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS food_items (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity DOUBLE PRECISION NOT NULL,
    unit TEXT NOT NULL,
    calories DOUBLE PRECISION NOT NULL,
    protein_g DOUBLE PRECISION NOT NULL,
    carbs_g DOUBLE PRECISION NOT NULL,
    fat_g DOUBLE PRECISION NOT NULL,
    sugar_g DOUBLE PRECISION NOT NULL,
    fiber_g DOUBLE PRECISION NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES food_log_entries(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    raw_input TEXT,
    activity_name TEXT NOT NULL,
    duration_minutes DOUBLE PRECISION NOT NULL,
    calories_burned DOUBLE PRECISION NOT NULL,
    met_value DOUBLE PRECISION,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS weight_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_lbs DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workout_performances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    exercise_type TEXT NOT NULL CHECK(exercise_type IN ('run', 'lift', 'cardio')),
    distance_miles DOUBLE PRECISION,
    time_seconds DOUBLE PRECISION,
    weight_lbs DOUBLE PRECISION,
    reps INTEGER,
    sets INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ... */
function toPostgres(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ─── SQLite adapter ─────────────────────────────────────────────────────────

function createSqliteClient(): DbClient {
  // Lazy require so Next.js doesn't try to bundle it for the browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const DB_PATH = path.join(process.cwd(), 'nutrilog.db');
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(SQLITE_SCHEMA);

  return {
    dialect: 'sqlite',

    query<T extends object>(sql: string, params: Params = []): Promise<T[]> {
      const rows = sqlite.prepare(sql).all(...params) as T[];
      return Promise.resolve(rows);
    },

    queryOne<T extends object>(sql: string, params: Params = []): Promise<T | null> {
      const row = sqlite.prepare(sql).get(...params) as T | undefined;
      return Promise.resolve(row ?? null);
    },

    run(sql: string, params: Params = []): Promise<{ rowCount: number }> {
      const info = sqlite.prepare(sql).run(...params);
      return Promise.resolve({ rowCount: info.changes });
    },
  };
}

// ─── PostgreSQL adapter ─────────────────────────────────────────────────────

function createPgClient(connectionString: string): DbClient {
  const { Pool } = pgTypes;
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  let schemaReady = false;

  async function ensureSchema(): Promise<void> {
    if (schemaReady) return;
    const client = await pool.connect();
    try {
      await client.query(PG_SCHEMA);
      schemaReady = true;
    } finally {
      client.release();
    }
  }

  return {
    dialect: 'postgres',

    async query<T extends object>(sql: string, params: Params = []): Promise<T[]> {
      await ensureSchema();
      const result = await pool.query<T>(toPostgres(sql), params as unknown[]);
      return result.rows;
    },

    async queryOne<T extends object>(sql: string, params: Params = []): Promise<T | null> {
      await ensureSchema();
      const result = await pool.query<T>(toPostgres(sql), params as unknown[]);
      return result.rows[0] ?? null;
    },

    async run(sql: string, params: Params = []): Promise<{ rowCount: number }> {
      await ensureSchema();
      const result = await pool.query(toPostgres(sql), params as unknown[]);
      return { rowCount: result.rowCount ?? 0 };
    },
  };
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let dbInstance: DbClient | null = null;

export function getDb(): DbClient {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    dbInstance = connectionString
      ? createPgClient(connectionString)
      : createSqliteClient();
  }
  return dbInstance;
}

export default getDb;
