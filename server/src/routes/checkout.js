import { Router } from 'express';
import crypto from 'node:crypto';
import Stripe from 'stripe';
import { pool, query } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { PRODUCTS, SIZES, SHIPPING_COST, round2, normalizeStyle, priceFor } from '../services/pricing.js';

const router = Router();
router.use(requireAuth);

const stripe = config.stripeMode === 'stripe' ? new Stripe(config.stripeSecretKey) : null;
const REQUIRED_ADDRESS = ['fullName', 'line1', 'city', 'postalCode', 'country'];

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) throw Object.assign(new Error('Cart is empty'), { status: 400 });
  return items.map((it) => {
    const product = PRODUCTS[it.productType];
    if (!product) throw Object.assign(new Error(`Unknown product "${it.productType}"`), { status: 400 });
    if (!SIZES.includes(it.size)) throw Object.assign(new Error(`Invalid size "${it.size}"`), { status: 400 });
    const quantity = Number(it.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw Object.assign(new Error('Invalid quantity'), { status: 400 });
    if (typeof it.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(it.color)) throw Object.assign(new Error('Invalid color'), { status: 400 });
    const style = normalizeStyle(it.productType, it);
    const hoodie = it.productType === 'hoodie';
    return {
      productType: it.productType,
      productName: product.name,
      color: it.color,
      size: it.size,
      neckline: hoodie ? null : style.neckline,
      sleeveLength: hoodie ? 'full' : style.sleeveLength,
      hoodieType: hoodie ? style.hoodieType : null,
      hoodStyle: hoodie ? style.hoodStyle : null,
      designImageUrl: it.designImageUrl || null,
      backDesignImageUrl: it.backDesignImageUrl || null,
      designConfig: it.designConfig || null,
      thumbnailUrl: it.thumbnailUrl || null,
      price: priceFor(it.productType, style),
      quantity,
    };
  });
}

function validateAddress(addr) {
  if (!addr || typeof addr !== 'object') throw Object.assign(new Error('Shipping address is required'), { status: 400 });
  for (const f of REQUIRED_ADDRESS) {
    if (!String(addr[f] || '').trim()) throw Object.assign(new Error(`Shipping address: ${f} is required`), { status: 400 });
  }
  const pick = (k) => String(addr[k] || '').trim();
  return {
    fullName: pick('fullName'), line1: pick('line1'), line2: pick('line2'), city: pick('city'),
    state: pick('state'), postalCode: pick('postalCode'), country: pick('country'), phone: pick('phone'),
  };
}

router.post('/session', async (req, res) => {
  const items = validateItems(req.body?.items);
  const shippingAddress = validateAddress(req.body?.shippingAddress);
  const subtotal = round2(items.reduce((s, it) => s + it.price * it.quantity, 0));
  const total = round2(subtotal + SHIPPING_COST);

  const client = await pool.connect();
  let orderId;
  try {
    await client.query('BEGIN');
    const order = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, shipping_cost, total_price, shipping_address)
       VALUES ($1, 'pending', $2, $3, $4, $5) RETURNING id`,
      [req.user.id, subtotal, SHIPPING_COST, total, shippingAddress]
    );
    orderId = order.rows[0].id;
    for (const it of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_type, color, size, neckline, sleeve_length, hoodie_type, hood_style,
                                  design_image_url, back_design_image_url, design_config, thumbnail_url, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [orderId, it.productType, it.color, it.size, it.neckline, it.sleeveLength, it.hoodieType, it.hoodStyle,
          it.designImageUrl, it.backDesignImageUrl, it.designConfig, it.thumbnailUrl, it.price, it.quantity]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (!stripe) {
    const sessionId = `cs_mock_${crypto.randomBytes(12).toString('hex')}`;
    await query(
      `INSERT INTO payments (order_id, stripe_session_id, amount, status) VALUES ($1, $2, $3, 'pending')`,
      [orderId, sessionId, total]
    );
    return res.json({ url: `/checkout/pay/${orderId}?session=${sessionId}`, orderId, mode: 'mock' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: req.user.email,
    line_items: [
      ...items.map((it) => ({
        quantity: it.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(it.price * 100),
          product_data: {
            name: `InkLabs Custom ${it.productName}`,
            description: [it.neckline, it.sleeveLength, it.hoodieType, it.hoodStyle].filter(Boolean).join(' / ') + ` · Size ${it.size} · Color ${it.color}`,
            ...(it.thumbnailUrl?.startsWith('http') ? { images: [it.thumbnailUrl] } : {}),
          },
        },
      })),
      {
        quantity: 1,
        price_data: { currency: 'usd', unit_amount: Math.round(SHIPPING_COST * 100), product_data: { name: 'Shipping' } },
      },
    ],
    metadata: { order_id: String(orderId), user_id: String(req.user.id) },
    success_url: `${config.clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.clientUrl}/checkout?canceled=1`,
  });

  await query(
    `INSERT INTO payments (order_id, stripe_session_id, amount, status) VALUES ($1, $2, $3, 'pending')`,
    [orderId, session.id, total]
  );
  res.json({ url: session.url, orderId, mode: 'stripe' });
});

router.post('/mock-complete', async (req, res) => {
  if (stripe) return res.status(400).json({ error: 'Mock payments are disabled in stripe mode' });
  const { orderId, sessionId } = req.body || {};
  const { rows } = await query(
    `SELECT p.id, p.status FROM payments p JOIN orders o ON o.id = p.order_id
     WHERE p.stripe_session_id = $1 AND o.id = $2 AND o.user_id = $3`,
    [sessionId, Number(orderId), req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Payment session not found' });
  if (rows[0].status !== 'paid') {
    await query(`UPDATE payments SET status = 'paid', stripe_payment_id = $2 WHERE id = $1`, [
      rows[0].id,
      `pi_mock_${crypto.randomBytes(8).toString('hex')}`,
    ]);
  }
  res.json({ orderId: Number(orderId) });
});

router.post('/confirm', async (req, res) => {
  const { sessionId } = req.body || {};
  const { rows } = await query(
    `SELECT p.id, p.status, p.order_id, o.user_id FROM payments p JOIN orders o ON o.id = p.order_id
     WHERE p.stripe_session_id = $1`,
    [sessionId]
  );
  if (!rows.length || rows[0].user_id !== req.user.id) return res.status(404).json({ error: 'Payment session not found' });
  const payment = rows[0];
  if (payment.status === 'paid') return res.json({ orderId: payment.order_id });
  if (!stripe) return res.status(402).json({ error: 'Payment not completed' });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Payment not completed' });
  await query(`UPDATE payments SET status = 'paid', stripe_payment_id = $2 WHERE id = $1`, [
    payment.id,
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
  ]);
  res.json({ orderId: payment.order_id });
});

export default router;
