import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { ORDER_STATUS, PAYMENT_STATUS, PRODUCTS, colorName, styleLabels, styleOf } from '../lib/catalog.js';
import { formatDate, formatDateTime, money, usePageTitle } from '../lib/format.js';

export default function Dashboard() {
  usePageTitle('My Inventory');
  const { user } = useAuth();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/api/orders'), api.get('/api/billing')])
      .then(([o, p]) => {
        setOrders(o.orders);
        setPayments(p.payments);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Inventory</h1>
          <p className="mt-1 text-sm text-zinc-600">Hi {user?.name} — every design you've ordered lives here.</p>
        </div>
        <Link to="/customize" className="btn-primary">New design</Link>
      </div>

      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {[['orders', 'Orders'], ['billing', 'Billing history']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === key ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!error && !orders && <p className="mt-8 text-sm text-zinc-500">Loading…</p>}

      {orders && tab === 'orders' && (
        orders.length ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const status = ORDER_STATUS[order.status];
              const first = order.items[0];
              return (
                <li key={order.id}>
                  <Link to={`/orders/${order.id}`} className="card block overflow-hidden transition hover:shadow-md">
                    <div className="relative aspect-square bg-zinc-100">
                      {first?.thumbnail_url && <img src={first.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                      <span className={`badge absolute left-3 top-3 ${status.className}`}>{status.label}</span>
                      {order.items.length > 1 && (
                        <span className="badge absolute right-3 top-3 bg-white/90 text-zinc-700">+{order.items.length - 1} more</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Order #{order.id}</span>
                        <span className="font-semibold">{money(order.total_price)}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-sm text-zinc-600">
                        {order.items.map((it) => (
                          <li key={it.id}>
                            {[PRODUCTS[it.product_type]?.name, ...styleLabels(it.product_type, styleOf(it)), colorName(it.color), it.size].join(' · ')}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-zinc-500">Booked {formatDate(order.created_at)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-12 text-center">
            <p className="text-zinc-600">No orders yet.</p>
            <Link to="/customize" className="btn-primary mt-4">Design your first piece</Link>
          </div>
        )
      )}

      {payments && tab === 'billing' && (
        <div className="card mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.length ? payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{formatDateTime(p.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">INV-{String(p.id).padStart(5, '0')}</td>
                  <td className="px-4 py-3"><Link to={`/orders/${p.order_id}`} className="text-indigo-600 hover:underline">#{p.order_id}</Link></td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.stripe_payment_id || '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${PAYMENT_STATUS[p.status].className}`}>{PAYMENT_STATUS[p.status].label}</span></td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{money(p.amount)} <span className="text-xs uppercase text-zinc-400">{p.currency}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
