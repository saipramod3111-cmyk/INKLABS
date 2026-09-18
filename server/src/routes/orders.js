import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const ORDER_WITH_ITEMS = `
  SELECT o.id, o.status, o.subtotal, o.shipping_cost, o.total_price, o.shipping_address, o.created_at,
         p.status AS payment_status, p.stripe_payment_id,
         COALESCE(json_agg(oi ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
  FROM orders o
  JOIN payments p ON p.order_id = o.id AND p.status = 'paid'
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.user_id = $1
  GROUP BY o.id, p.id
  ORDER BY o.created_at DESC`;

router.get('/orders', async (req, res) => {
  const { rows } = await query(ORDER_WITH_ITEMS, [req.user.id]);
  res.json({ orders: rows });
});

router.get('/orders/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid order id' });

  const order = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  if (!order.rowCount) return res.status(404).json({ error: 'Order not found' });

  const [items, payments] = await Promise.all([
    query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]),
    query('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC', [id]),
  ]);
  res.json({ order: order.rows[0], items: items.rows, payments: payments.rows });
});

router.get('/billing', async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.order_id, p.stripe_payment_id, p.amount, p.currency, p.status, p.created_at
     FROM payments p JOIN orders o ON o.id = p.order_id
     WHERE o.user_id = $1 AND p.status <> 'pending'
     ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  res.json({ payments: rows });
});

export default router;
