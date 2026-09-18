import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Viewer from '../components/three/Viewer.jsx';
import { api } from '../lib/api.js';
import { ORDER_STATUS, ORDER_STATUS_STEPS, PAYMENT_STATUS, PRODUCTS, colorName, styleLabels, styleOf } from '../lib/catalog.js';
import { formatDateTime, money, usePageTitle } from '../lib/format.js';

export default function OrderDetail() {
  const { id } = useParams();
  usePageTitle(`Order #${id}`);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open3d, setOpen3d] = useState({});

  useEffect(() => {
    api.get(`/api/orders/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-zinc-600">{error} · <Link to="/dashboard" className="text-indigo-600 hover:underline">Back to inventory</Link></div>;
  if (!data) return <div className="p-16 text-center text-sm text-zinc-500">Loading…</div>;

  const { order, items, payments } = data;
  const payment = payments.find((p) => p.status === 'paid') || payments[0];
  const status = ORDER_STATUS[order.status];
  const stepIndex = ORDER_STATUS_STEPS.indexOf(order.status);
  const addr = order.shipping_address || {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/dashboard" className="text-sm text-zinc-500 hover:underline">← My Inventory</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order #{order.id}</h1>
          <p className="mt-1 text-sm text-zinc-600">Booked {formatDateTime(order.created_at)}</p>
        </div>
        <span className={`badge px-3 py-1 text-sm ${status.className}`}>{status.label}</span>
      </div>

      <ol className="mt-6 grid grid-cols-4 gap-2">
        {ORDER_STATUS_STEPS.map((s, i) => (
          <li key={s} className="text-center">
            <div className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-indigo-600' : 'bg-zinc-200'}`} />
            <div className={`mt-2 text-xs font-medium ${i <= stepIndex ? 'text-zinc-900' : 'text-zinc-400'}`}>{ORDER_STATUS[s].label}</div>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex gap-4">
                <img src={item.thumbnail_url} alt="" className="h-28 w-28 flex-shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 object-cover" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Custom {PRODUCTS[item.product_type]?.name}</div>
                      {styleLabels(item.product_type, styleOf(item)).length > 0 && (
                        <div className="mt-0.5 text-sm text-zinc-700">{styleLabels(item.product_type, styleOf(item)).join(' · ')}</div>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                        <span className="inline-block h-3.5 w-3.5 rounded-full border border-zinc-300" style={{ backgroundColor: item.color }} />
                        {colorName(item.color)} ({item.color}) · Size {item.size} · Qty {item.quantity}
                      </div>
                    </div>
                    <div className="text-right font-semibold">{money(item.price * item.quantity)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    {item.design_image_url && (
                      <a href={item.design_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                        <img src={item.design_image_url} alt="" className="h-6 w-6 rounded border border-zinc-200 bg-white object-contain" /> Front artwork
                      </a>
                    )}
                    {item.back_design_image_url && (
                      <a href={item.back_design_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                        <img src={item.back_design_image_url} alt="" className="h-6 w-6 rounded border border-zinc-200 bg-white object-contain" /> Back artwork
                      </a>
                    )}
                    <button onClick={() => setOpen3d((o) => ({ ...o, [item.id]: !o[item.id] }))} className="btn-secondary py-1 text-xs">
                      {open3d[item.id] ? 'Hide 3D view' : 'View in 3D'}
                    </button>
                  </div>
                </div>
              </div>
              {open3d[item.id] && (
                <div className="mt-4 h-[360px] overflow-hidden rounded-lg border border-zinc-200">
                  <Viewer
                    productType={item.product_type}
                    color={item.color}
                    style={styleOf(item)}
                    front={item.design_image_url ? { url: item.design_image_url, config: item.design_config?.front } : null}
                    back={item.back_design_image_url ? { url: item.back_design_image_url, config: item.design_config?.back } : null}
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold">Price breakdown</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-zinc-600">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-600">Shipping</dt><dd>{money(order.shipping_cost)}</dd></div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{money(order.total_price)}</dd></div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold">Payment</h2>
            {payment ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-zinc-600">Status</dt><dd><span className={`badge ${PAYMENT_STATUS[payment.status].className}`}>{PAYMENT_STATUS[payment.status].label}</span></dd></div>
                <div className="flex justify-between"><dt className="text-zinc-600">Amount</dt><dd>{money(payment.amount)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-zinc-600">Reference</dt><dd className="truncate font-mono text-xs">{payment.stripe_payment_id || payment.stripe_session_id}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-600">Date</dt><dd>{formatDateTime(payment.created_at)}</dd></div>
              </dl>
            ) : <p className="mt-2 text-sm text-zinc-500">No payment recorded.</p>}
          </div>

          <div className="card p-5">
            <h2 className="font-semibold">Ships to</h2>
            <address className="mt-2 text-sm not-italic text-zinc-700">
              {addr.fullName}<br />
              {addr.line1}{addr.line2 && <>, {addr.line2}</>}<br />
              {addr.city}{addr.state && `, ${addr.state}`} {addr.postalCode}<br />
              {addr.country}
              {addr.phone && <><br />{addr.phone}</>}
            </address>
          </div>
        </aside>
      </div>
    </div>
  );
}
