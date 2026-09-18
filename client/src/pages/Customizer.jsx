import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Viewer from '../components/three/Viewer.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';
import { captureSnapshot } from '../lib/snapshot.js';
import { COLORS, DEFAULT_STYLE, PRODUCTS, SIZES, STYLE_OPTIONS, colorName, decalDefaults, priceFor, styleLabels } from '../lib/catalog.js';
import { money, usePageTitle } from '../lib/format.js';

const SLIDERS = [
  { key: 'x', label: 'Horizontal', min: -0.7, max: 0.7, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'y', label: 'Vertical', min: -0.8, max: 0.8, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'scale', label: 'Size', min: 0.3, max: 1.6, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, format: (v) => `${Math.round(v)}°` },
];

const sameConfig = (a, b) => a && b && SLIDERS.every((s) => Math.abs((a[s.key] ?? 0) - (b[s.key] ?? 0)) < 1e-6);

export default function Customizer() {
  usePageTitle('Design your own');
  const cart = useCart();
  const sceneRef = useRef(null);

  const [productType, setProductType] = useState('tshirt');
  const [style, setStyle] = useState({ ...DEFAULT_STYLE });
  const [color, setColor] = useState(COLORS[0].hex);
  const [size, setSize] = useState('M');
  const [side, setSide] = useState('front');
  const [designs, setDesigns] = useState({ front: { url: null, config: null }, back: { url: null, config: null } });
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState(null);

  const defaults = decalDefaults(productType, style);
  const current = designs[side];
  const price = priceFor(productType, style);

  const updateConfig = (patch) =>
    setDesigns((d) => ({ ...d, [side]: { ...d[side], config: { ...(d[side].config || defaults), ...patch } } }));

  // Prints still sitting at the old style's default spot follow the new style's default;
  // anything the user has positioned by hand stays put.
  const changeStyle = (nextType, nextStyle) => {
    const prev = decalDefaults(productType, style);
    const next = decalDefaults(nextType, nextStyle);
    setProductType(nextType);
    setStyle(nextStyle);
    setDesigns((d) => {
      const out = { ...d };
      for (const key of ['front', 'back']) {
        if (d[key].url && sameConfig(d[key].config, prev)) out[key] = { ...d[key], config: { ...next } };
      }
      return out;
    });
  };

  const flash = (message, kind = 'ok') => {
    setNotice({ message, kind });
    setTimeout(() => setNotice(null), 3500);
  };

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { url } = await api.upload('/api/upload/design', form);
      setDesigns((d) => ({ ...d, [side]: { url, config: { ...defaults } } }));
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleAddToCart() {
    if (!sceneRef.current) return;
    setAdding(true);
    try {
      const dataUrl = captureSnapshot(sceneRef.current);
      const { url: thumbnailUrl } = await api.post('/api/upload/snapshot', { dataUrl });
      const hoodie = productType === 'hoodie';
      cart.addItem({
        productType,
        productName: PRODUCTS[productType].name,
        color,
        colorName: colorName(color),
        size,
        neckline: hoodie ? null : style.neckline,
        sleeveLength: hoodie ? 'full' : style.sleeveLength,
        hoodieType: hoodie ? style.hoodieType : null,
        hoodStyle: hoodie ? style.hoodStyle : null,
        designImageUrl: designs.front.url,
        backDesignImageUrl: designs.back.url,
        designConfig: {
          front: designs.front.url ? designs.front.config : null,
          back: designs.back.url ? designs.back.config : null,
        },
        thumbnailUrl,
        price,
        quantity: 1,
      });
      flash('Added to cart');
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Design your own</h1>
          <p className="mt-1 text-sm text-zinc-600">Drag to rotate · scroll to zoom · upload a PNG for transparent prints</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Price</div>
          <div className="text-2xl font-bold">{money(price)}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card relative h-[420px] overflow-hidden sm:h-[560px] lg:sticky lg:top-20">
          <Viewer
            productType={productType}
            color={color}
            style={style}
            front={designs.front.url ? designs.front : null}
            back={designs.back.url ? designs.back : null}
            onCreated={(state) => (sceneRef.current = state)}
            className="h-full w-full"
          />
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur">
            {[PRODUCTS[productType].name, ...styleLabels(productType, style), colorName(color), size].join(' · ')}
          </div>
          {notice && (
            <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow ${notice.kind === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'}`}>
              {notice.message}
              {notice.kind !== 'error' && (
                <Link to="/cart" className="ml-3 underline">View cart</Link>
              )}
            </div>
          )}
        </div>

        <aside className="card space-y-6 p-5">
          <Section title="Product">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PRODUCTS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => changeStyle(key, style)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${productType === key ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 hover:bg-zinc-50'}`}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className={`text-xs ${productType === key ? 'text-zinc-300' : 'text-zinc-500'}`}>from {money(p.price)}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Style">
            <div className="space-y-3">
              {STYLE_OPTIONS[productType].map((group) => (
                <div key={group.key}>
                  <div className="mb-1 text-xs text-zinc-600">{group.label}</div>
                  <div className="flex gap-2">
                    {group.options.map((opt) => {
                      const active = style[group.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => changeStyle(productType, { ...style, [group.key]: opt.value })}
                          className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 hover:bg-zinc-50'}`}
                        >
                          {opt.label}
                          {opt.surcharge > 0 && <span className={`ml-1 ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>+{money(opt.surcharge)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Colour · ${colorName(color)}`}>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  title={c.name}
                  onClick={() => setColor(c.hex)}
                  className={`h-8 w-8 rounded-full border-2 transition ${color === c.hex ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-zinc-300'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <label className="ml-1 flex h-8 cursor-pointer items-center gap-1 rounded-full border border-dashed border-zinc-400 px-2 text-xs text-zinc-600">
                Custom
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" />
              </label>
            </div>
          </Section>

          <Section title="Print design">
            <div className="mb-3 grid grid-cols-2 rounded-lg bg-zinc-100 p-1 text-sm">
              {['front', 'back'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`rounded-md py-1.5 capitalize transition ${side === s ? 'bg-white font-semibold shadow-sm' : 'text-zinc-600'}`}
                >
                  {s} {designs[s].url && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-600 align-middle" />}
                </button>
              ))}
            </div>

            {current.url ? (
              <div className="flex items-center gap-3">
                <img src={current.url} alt="" className="h-14 w-14 rounded-md border border-zinc-200 bg-white object-contain" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="btn-secondary cursor-pointer py-1.5 text-xs">
                    {uploading ? 'Uploading…' : 'Replace image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                  <button
                    onClick={() => setDesigns((d) => ({ ...d, [side]: { url: null, config: null } }))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove {side} print
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-600 hover:border-indigo-400 hover:bg-indigo-50/40">
                <span className="font-medium text-zinc-800">{uploading ? 'Uploading…' : `Upload ${side} artwork`}</span>
                <span className="mt-1 text-xs">PNG, JPG or SVG · up to 8 MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}

            {current.url && (
              <div className="mt-4 space-y-3">
                {SLIDERS.map((s) => (
                  <div key={s.key}>
                    <div className="mb-1 flex justify-between text-xs text-zinc-600">
                      <span>{s.label}</span>
                      <span className="tabular-nums">{s.format((current.config || defaults)[s.key])}</span>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={(current.config || defaults)[s.key]}
                      onChange={(e) => updateConfig({ [s.key]: Number(e.target.value) })}
                    />
                  </div>
                ))}
                <button onClick={() => updateConfig({ ...defaults })} className="text-xs text-zinc-500 hover:underline">
                  Reset position for this style
                </button>
              </div>
            )}
          </Section>

          <Section title="Size">
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${size === s ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 hover:bg-zinc-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Section>

          <button onClick={handleAddToCart} disabled={adding || uploading} className="btn-accent w-full py-3 text-base">
            {adding ? 'Saving snapshot…' : `Add to cart · ${money(price)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}
