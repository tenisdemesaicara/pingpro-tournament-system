import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Render database configuration with environment variable override protection
const RENDER_DB_CONFIG = {
  host: 'dpg-d2td0iffte5s73a47nng-a.oregon-postgres.render.com',
  database: 'pingpro',
  user: 'pingpro_user',
  port: 5432
};

// Use dedicated RENDER password
const renderPassword = process.env.RENDER_DB_PASSWORD;
if (!renderPassword) {
  throw new Error('RENDER_DB_PASSWORD is required for database connection');
}

// Clear conflicting environment variables that override connection settings
const conflictingVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
conflictingVars.forEach(varName => {
  delete process.env[varName];
});

// Direct Render database connection
export const pool = new Pool({
  host: RENDER_DB_CONFIG.host,
  database: RENDER_DB_CONFIG.database,
  user: RENDER_DB_CONFIG.user,
  password: renderPassword,
  port: RENDER_DB_CONFIG.port,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
