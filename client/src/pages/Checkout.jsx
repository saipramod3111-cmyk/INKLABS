import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { money, usePageTitle } from '../lib/format.js';
import { styleLabels, styleOf } from '../lib/catalog.js';

const FIELDS = [
  { name: 'fullName', label: 'Full name', required: true, span: 2 },
  { name: 'line1', label: 'Address line 1', required: true, span: 2 },
  { name: 'line2', label: 'Address line 2', span: 2 },
  { name: 'city', label: 'City', required: true },
  { name: 'state', label: 'State / Region' },
  { name: 'postalCode', label: 'Postal code', required: true },
  { name: 'country', label: 'Country', required: true },
  { name: 'phone', label: 'Phone', span: 2 },
];

export default function Checkout() {
  usePageTitle('Checkout');
  const { items, subtotal, shipping, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [address, setAddress] = useState({ fullName: user?.name || '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(params.get('canceled') ? 'Payment was cancelled. You can try again.' : null);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Nothing to check out</h1>
        <Link to="/customize" className="btn-primary mt-6">Start designing</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        shippingAddress: address,
        items: items.map(({ productType, color, size, neckline, sleeveLength, hoodieType, hoodStyle, designImageUrl, backDesignImageUrl, designConfig, thumbnailUrl, quantity }) => ({
          productType, color, size, neckline, sleeveLength, hoodieType, hoodStyle, designImageUrl, backDesignImageUrl, designConfig, thumbnailUrl, quantity,
        })),
      };
      const { url } = await api.post('/api/checkout/session', payload);
      if (/^https?:\/\//.test(url)) window.location.assign(url);
      else navigate(url);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card p-6">
          <h2 className="font-semibold">Shipping address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.name} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                <label className="label" htmlFor={f.name}>{f.label}{f.required && ' *'}</label>
                <input
                  id={f.name}
                  className="input"
                  required={f.required}
                  value={address[f.name]}
                  onChange={(e) => setAddress((a) => ({ ...a, [f.name]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </section>

        <aside className="card h-fit p-5">
          <h2 className="font-semibold">Your order</h2>
          <ul className="mt-3 divide-y divide-zinc-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                <img src={item.thumbnailUrl} alt="" className="h-12 w-12 rounded border border-zinc-200 object-cover" />
                <div className="flex-1">
                  <div className="font-medium">{item.productName} × {item.quantity}</div>
                  <div className="text-xs text-zinc-500">{[...styleLabels(item.productType, styleOf(item)), item.colorName, item.size].join(' · ')}</div>
                </div>
                <div className="tabular-nums">{money(item.price * item.quantity)}</div>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-600">Subtotal</dt><dd>{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-600">Shipping</dt><dd>{money(shipping)}</dd></div>
            <div className="flex justify-between pt-1 text-base font-bold"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
          <button type="submit" disabled={submitting} className="btn-accent mt-5 w-full py-3">
            {submitting ? 'Redirecting to payment…' : `Pay ${money(total)} with Stripe`}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500">Test mode — no real charge is made.</p>
        </aside>
      </form>
    </div>
  );
}
