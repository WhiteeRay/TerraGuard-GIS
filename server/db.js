import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.PGPOOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

pool.on('error', (error) => console.error('Database connection error:', error.message));

export const query = (text, values) => pool.query(text, values);
