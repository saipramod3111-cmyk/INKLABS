import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { money, usePageTitle } from '../lib/format.js';
import { styleLabels, styleOf } from '../lib/catalog.js';

export default function Cart() {
  usePageTitle('Cart');
  const { items, removeItem, updateQuantity, subtotal, shipping, total } = useCart();
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-zinc-600">Design a shirt or hoodie and it will show up here.</p>
        <Link to="/customize" className="btn-primary mt-6">Start designing</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Cart</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="card flex gap-4 p-4">
              <img src={item.thumbnailUrl} alt="" className="h-28 w-28 flex-shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 object-cover" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">Custom {item.productName}</div>
                    <div className="mt-0.5 text-sm text-zinc-700">{styleLabels(item.productType, styleOf(item)).join(' · ')}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                      <span className="inline-block h-3.5 w-3.5 rounded-full border border-zinc-300" style={{ backgroundColor: item.color }} />
                      {item.colorName} · Size {item.size}
                      {item.designImageUrl && ' · Front print'}
                      {item.backDesignImageUrl && ' · Back print'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{money(item.price * item.quantity)}</div>
                    <div className="text-xs text-zinc-500">{money(item.price)} each</div>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-lg border border-zinc-300">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-lg leading-none hover:bg-zinc-100" aria-label="Decrease">−</button>
                    <span className="w-10 text-center text-sm tabular-nums">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-lg leading-none hover:bg-zinc-100" aria-label="Increase">+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit p-5">
          <h2 className="font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={money(subtotal)} />
            <Row label="Shipping" value={money(shipping)} />
            <div className="border-t border-zinc-200 pt-2">
              <Row label={<span className="font-semibold">Total</span>} value={<span className="text-lg font-bold">{money(total)}</span>} />
            </div>
          </dl>
          <button onClick={() => navigate('/checkout')} className="btn-accent mt-5 w-full py-3">Checkout</button>
          <Link to="/customize" className="mt-3 block text-center text-sm text-zinc-600 hover:underline">Add another design</Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
