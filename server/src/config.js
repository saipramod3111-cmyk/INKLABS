import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  stripeMode: process.env.STRIPE_MODE === 'stripe' ? 'stripe' : 'mock',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  uploadDir: path.resolve(__dirname, '../uploads'),
};
