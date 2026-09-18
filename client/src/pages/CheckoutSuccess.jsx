import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';
import { usePageTitle } from '../lib/format.js';

export default function CheckoutSuccess() {
  usePageTitle('Order confirmed');
  const [params] = useSearchParams();
  const cart = useCart();
  const [orderId, setOrderId] = useState(params.get('order_id'));
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = params.get('session_id');
    if (!sessionId) return;
    api.post('/api/checkout/confirm', { sessionId })
      .then((d) => {
        setOrderId(d.orderId);
        cart.clear();
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">We couldn't confirm your payment</h1>
        <p className="mt-2 text-zinc-600">{error}</p>
        <Link to="/checkout" className="btn-primary mt-6">Back to checkout</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
      <h1 className="mt-6 text-3xl font-bold">Booking confirmed</h1>
      <p className="mt-2 text-zinc-600">
        {orderId ? <>Order <span className="font-semibold text-zinc-900">#{orderId}</span> is queued for printing.</> : 'Confirming your payment…'}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        {orderId && <Link to={`/orders/${orderId}`} className="btn-primary">View order</Link>}
        <Link to="/dashboard" className="btn-secondary">My inventory</Link>
      </div>
    </div>
  );
}
