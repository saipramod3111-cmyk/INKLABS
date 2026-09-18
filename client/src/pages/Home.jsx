import { Link } from 'react-router-dom';
import Viewer from '../components/three/Viewer.jsx';
import { DEFAULT_DECAL, PRODUCTS } from '../lib/catalog.js';
import { money, usePageTitle } from '../lib/format.js';

const FEATURES = [
  { title: 'Design in 3D', body: 'Drop your artwork on a shirt or hoodie and spin it 360° to see exactly how it prints.' },
  { title: 'No minimums', body: 'Every piece is printed to order. Buy one, or a hundred — same price per item.' },
  { title: 'Track every order', body: 'Your inventory dashboard keeps every design, size, colour and invoice in one place.' },
];

const STEPS = ['Pick a t-shirt or hoodie', 'Choose a colour and upload your art', 'Position, scale and rotate the print', 'Check out — we print and ship it'];

export default function Home() {
  usePageTitle('Custom Print-on-Demand Apparel');
  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Print on demand</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Design it in 3D.
            <br />
            We print it for you.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-zinc-600">
            Upload your artwork, wrap it onto a t-shirt or hoodie, rotate the garment a full 360°, and order — no inventory, no minimums.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/customize" className="btn-primary px-6 py-3 text-base">Start designing</Link>
            <Link to="/dashboard" className="btn-secondary px-6 py-3 text-base">My inventory</Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm text-zinc-600">
            {Object.values(PRODUCTS).map((p) => (
              <div key={p.name}>
                <div className="text-2xl font-bold text-zinc-900">{money(p.price)}</div>
                {p.name}
              </div>
            ))}
          </div>
        </div>
        <div className="card h-[380px] overflow-hidden sm:h-[460px]">
          <Viewer productType="hoodie" color="#1f2a44" style={{ hoodieType: 'zip' }} front={{ url: '/uploads/seed/design-bolt.svg', config: { ...DEFAULT_DECAL, x: 0.38, y: 0.3, scale: 0.5 } }} autoRotate className="h-full w-full" />
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl bg-zinc-50 p-6">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s} className="card p-5">
              <span className="text-xs font-bold text-indigo-600">STEP {i + 1}</span>
              <p className="mt-2 font-medium">{s}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
