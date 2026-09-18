import pg from 'pg';
import { config } from './config.js';

// NUMERIC columns come back as strings by default; the API always wants numbers.
pg.types.setTypeParser(1700, (v) => parseFloat(v));

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
export const query = (text, params) => pool.query(text, params);
