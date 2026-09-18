import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { priceFor } from '../src/services/pricing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');

async function ensureDatabase() {
  const url = new URL(config.databaseUrl);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!rowCount) {
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`Created database "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

const DEFAULT_DECAL = { x: 0, y: 0.25, scale: 0.9, rotation: 0 };

async function seed(client) {
  const hash = await bcrypt.hash('password123', 10);
  const userIds = {};
  for (const [key, name, email] of [
    ['demo', 'Demo User', 'demo@inklabs.com'],
    ['alex', 'Alex Rivera', 'alex@inklabs.com'],
  ]) {
    const { rows } = await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash]
    );
    userIds[key] = rows[0].id;
  }

  const address = (fullName) => ({
    fullName, line1: '221 Baker Street', line2: 'Apt 4', city: 'Austin', state: 'TX',
    postalCode: '73301', country: 'US', phone: '+1 555 010 0100',
  });

  const item = (product_type, color, size, design, thumb, quantity = 1, back = null, style = {}) => {
    const hoodie = product_type === 'hoodie';
    const s = { neckline: 'round', sleeveLength: 'half', hoodieType: 'pullover', hoodStyle: 'regular', ...style };
    return {
      product_type, color, size, quantity,
      neckline: hoodie ? null : s.neckline,
      sleeve_length: hoodie ? 'full' : s.sleeveLength,
      hoodie_type: hoodie ? s.hoodieType : null,
      hood_style: hoodie ? s.hoodStyle : null,
      design_image_url: design, back_design_image_url: back,
      thumbnail_url: thumb,
      design_config: { front: DEFAULT_DECAL, back: back ? DEFAULT_DECAL : null },
      price: priceFor(product_type, s),
    };
  };

  const orders = [
    { user: 'demo', status: 'delivered', daysAgo: 24, items: [item('tshirt', '#1a1a1a', 'L', '/uploads/seed/design-bolt.svg', '/uploads/seed/thumb-tshirt-black.svg', 2)] },
    { user: 'demo', status: 'shipped', daysAgo: 7, items: [
      item('hoodie', '#1f2a44', 'M', '/uploads/seed/design-wave.svg', '/uploads/seed/thumb-hoodie-navy.svg', 1, null, { hoodieType: 'zip' }),
      item('tshirt', '#f5f5f5', 'S', '/uploads/seed/design-wave.svg', '/uploads/seed/thumb-tshirt-white.svg', 1, null, { neckline: 'vneck', sleeveLength: 'full' }),
    ] },
    { user: 'demo', status: 'in_production', daysAgo: 2, items: [item('hoodie', '#1e5631', 'XL', '/uploads/seed/design-bolt.svg', '/uploads/seed/thumb-hoodie-forest.svg', 1, '/uploads/seed/design-wave.svg', { hoodStyle: 'oversized' })] },
    { user: 'alex', status: 'pending', daysAgo: 1, items: [item('tshirt', '#f5f5f5', 'M', '/uploads/seed/design-bolt.svg', '/uploads/seed/thumb-tshirt-white.svg', 3, null, { neckline: 'polo' })] },
    { user: 'alex', status: 'delivered', daysAgo: 40, items: [item('hoodie', '#1f2a44', 'L', '/uploads/seed/design-wave.svg', '/uploads/seed/thumb-hoodie-navy.svg')] },
  ];

  for (const [i, o] of orders.entries()) {
    const subtotal = o.items.reduce((s, it) => s + it.price * it.quantity, 0);
    const shipping = 4.99;
    const total = Math.round((subtotal + shipping) * 100) / 100;
    const { rows } = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, shipping_cost, total_price, shipping_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - ($7 || ' days')::interval) RETURNING id`,
      [userIds[o.user], o.status, subtotal, shipping, total, address(o.user === 'demo' ? 'Demo User' : 'Alex Rivera'), String(o.daysAgo)]
    );
    const orderId = rows[0].id;
    for (const it of o.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_type, color, size, neckline, sleeve_length, hoodie_type, hood_style,
                                  design_image_url, back_design_image_url, design_config, thumbnail_url, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [orderId, it.product_type, it.color, it.size, it.neckline, it.sleeve_length, it.hoodie_type, it.hood_style,
          it.design_image_url, it.back_design_image_url, it.design_config, it.thumbnail_url, it.price, it.quantity]
      );
    }
    await client.query(
      `INSERT INTO payments (order_id, stripe_payment_id, stripe_session_id, amount, status, created_at)
       VALUES ($1, $2, $3, $4, 'paid', NOW() - ($5 || ' days')::interval)`,
      [orderId, `pi_seed_${1000 + i}`, `cs_seed_${1000 + i}`, total, String(o.daysAgo)]
    );
  }
}

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set. Copy server/.env.example to server/.env and edit it.');
  await ensureDatabase();

  const client = new pg.Client({ connectionString: config.databaseUrl });
  await client.connect();
  try {
    if (reset) {
      await client.query('DROP TABLE IF EXISTS payments, order_items, orders, users CASCADE');
      console.log('Dropped existing tables');
    }
    await client.query(await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8'));
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM users');
    if (rows[0].n === 0) {
      await seed(client);
      console.log('Seeded demo users (demo@inklabs.com / alex@inklabs.com, password: password123)');
    } else {
      console.log('Database already contains data, skipping seed');
    }
  } finally {
    await client.end();
  }
  console.log('Database ready');
}

main().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
