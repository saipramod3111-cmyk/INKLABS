import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';
import { money, usePageTitle } from '../lib/format.js';

// Stand-in for Stripe Checkout when STRIPE_MODE=mock on the server.
export default function MockPayment() {
  usePageTitle('Payment');
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const navigate = useNavigate();
  const cart = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get(`/api/orders/${orderId}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  }, [orderId]);

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      await api.post('/api/checkout/mock-complete', { orderId: Number(orderId), sessionId });
      cart.clear();
      navigate(`/checkout/success?order_id=${orderId}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card overflow-hidden">
        <div className="bg-[#635bff] px-6 py-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Stripe Checkout · test mode (mock)</div>
          <div className="mt-1 text-lg font-semibold">Pay InkLabs</div>
          <div className="text-3xl font-bold">{order ? money(order.total_price) : '…'}</div>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-xs text-zinc-500">
            This page simulates Stripe's hosted checkout. Set <code>STRIPE_MODE=stripe</code> and a test key in <code>server/.env</code> to use the real Stripe test flow.
          </p>
          <Field label="Card number" value="4242 4242 4242 4242" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry" value="12 / 34" />
            <Field label="CVC" value="123" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button onClick={pay} disabled={paying || !order} className="btn w-full bg-[#635bff] py-3 text-white hover:bg-[#5249e6]">
            {paying ? 'Processing…' : `Pay ${order ? money(order.total_price) : ''}`}
          </button>
          <Link to="/checkout?canceled=1" className="block text-center text-sm text-zinc-500 hover:underline">Cancel and go back</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input bg-zinc-50 font-mono" value={value} readOnly />
    </div>
  );
}
