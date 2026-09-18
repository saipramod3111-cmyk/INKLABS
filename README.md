# InkLabs — Custom Print-on-Demand Apparel

A functional prototype of a print-on-demand (POD) store: design a t-shirt or hoodie in a 360°-rotatable 3D viewer, upload artwork that wraps onto the garment as a decal, add it to a cart, check out with Stripe (test mode), and track every "booking" in a personal inventory dashboard.

| Layer     | Stack |
|-----------|-------|
| Frontend  | React 18 + Vite, Tailwind CSS, React Router |
| 3D        | Three.js via `@react-three/fiber` + `@react-three/drei` (`OrbitControls`, `Decal`, `ContactShadows`) |
| Backend   | Node 20 + Express 5 |
| Database  | PostgreSQL |
| Auth      | JWT in an httpOnly cookie, `bcryptjs` password hashing |
| Uploads   | Multer → local disk (`server/uploads`), behind a swappable storage adapter |
| Payments  | Stripe Checkout (test mode) with a built-in **mock** mode so it runs with no keys |

---

## Quick start (Windows)

```bat
start.bat
```

`start.bat` will:

1. Make sure the `postgresql-x64-18` Windows service is running (edit `PG_SERVICE` at the top if your service name differs).
2. Create `server/.env` from `server/.env.example` if it's missing — **stop here and set `DATABASE_URL`** (the `postgres` user's password), then re-run.
3. `npm install` in `server/` and `client/` on first run.
4. Create the `inklabs` database, apply `server/db/schema.sql` and seed demo data (idempotent — safe to run every time).
5. Open two console windows — **InkLabs Server** (API on http://localhost:4000) and **InkLabs Client** (Vite on http://localhost:5173) — and launch the browser.

```bat
end.bat
```

closes both windows and kills anything still listening on ports 4000 / 5173. PostgreSQL is left running.

### Demo accounts (seeded)

| Email               | Password      | Has |
|---------------------|---------------|-----|
| `demo@inklabs.com`  | `password123` | 3 orders (delivered / shipped / in production) |
| `alex@inklabs.com`  | `password123` | 2 orders |

---

## Manual start

### 1. Database

PostgreSQL must be running. Then in `server/.env`:

```
DATABASE_URL=postgres://postgres:<your-password>@localhost:5432/inklabs
```

```bash
cd server
npm install
npm run db:setup      # creates the DB if needed, applies schema, seeds once
# npm run db:reset    # drops all tables and re-seeds
```

### 2. Backend

```bash
cd server
npm run dev           # http://localhost:4000  (node --watch)
```

### 3. Frontend

```bash
cd client
npm install
npm run dev           # http://localhost:5173
```

Vite proxies `/api/*` and `/uploads/*` to the backend, so the browser only ever talks to `localhost:5173` and cookies work without any CORS configuration.

---

## Configuration (`server/.env`)

| Variable            | Default                  | Notes |
|---------------------|--------------------------|-------|
| `PORT`              | `4000`                   | API port |
| `CLIENT_URL`        | `http://localhost:5173`  | Used for CORS and Stripe redirect URLs |
| `DATABASE_URL`      | —                        | Required. DB is auto-created by `db:setup` |
| `JWT_SECRET`        | `dev-only-secret`        | Change in production |
| `STRIPE_MODE`       | `mock`                   | `mock` = built-in fake checkout page; `stripe` = real Stripe Checkout (test mode) |
| `STRIPE_SECRET_KEY` | `sk_test_REPLACE_ME`     | Only used when `STRIPE_MODE=stripe` |

### Using real Stripe test mode

1. Get a test secret key (`sk_test_...`) from the Stripe dashboard.
2. Set `STRIPE_MODE=stripe` and `STRIPE_SECRET_KEY=sk_test_...` in `server/.env`, restart the server.
3. Checkout now redirects to Stripe's hosted page. Use card `4242 4242 4242 4242`, any future expiry, any CVC.
4. On return, the client calls `POST /api/checkout/confirm` which retrieves the session server-side and marks the payment `paid`. (A webhook is not required for the prototype; add one at `/api/stripe/webhook` when you go live so payments are recorded even if the user closes the tab.)

In `mock` mode the same flow runs against `/checkout/pay/:orderId`, a local page that imitates Stripe and calls `POST /api/checkout/mock-complete`.

---

## How the pieces fit

```
client/src
├── components/three/
│   ├── Garment.jsx      procedural t-shirt / hoodie meshes + Decal projection (swap for GLTF here)
│   └── Viewer.jsx       R3F <Canvas> with lights, OrbitControls (360° drag, scroll zoom), ContactShadows
├── context/             AuthContext (JWT session), CartContext (localStorage cart)
├── lib/
│   ├── catalog.js       products, prices, colours, sizes, status labels
│   ├── snapshot.js      canvas.toDataURL → 512px JPEG thumbnail
│   └── api.js           fetch wrapper (credentials: include)
└── pages/               Home, Customizer, Cart, Checkout, MockPayment, CheckoutSuccess,
                         Login, Signup, Dashboard (orders + billing), OrderDetail

server/src
├── routes/auth.js       POST /api/auth/signup | login | logout, GET /api/auth/me
├── routes/upload.js     POST /api/upload/design (multipart), POST /api/upload/snapshot (data URL)
├── routes/checkout.js   POST /api/checkout/session | confirm | mock-complete
├── routes/orders.js     GET /api/orders, GET /api/orders/:id, GET /api/billing
├── services/storage.js  local-disk adapter — replace for S3 / Cloudinary
├── services/pricing.js  server-side price table (client prices are never trusted)
└── middleware/auth.js   requireAuth (cookie or Bearer token)

server/db
├── schema.sql           users, orders, order_items, payments
└── setup.js             create DB → schema → seed (npm run db:setup / db:reset)
```

### Order / booking flow

1. **Customizer** — pick product, colour, size; upload front/back artwork (`POST /api/upload/design`). The image is applied with drei's `<Decal>` on the torso mesh and can be moved / scaled / rotated with sliders.
2. **Add to cart** — the current Three.js frame is captured (`preserveDrawingBuffer: true` + `toDataURL`) and stored via `POST /api/upload/snapshot`; the cart item (product, colour, size, design URLs, decal config, thumbnail URL, price) lives in `localStorage`.
3. **Checkout** — shipping address + `POST /api/checkout/session`. The server re-prices every item, inserts an `orders` row (status `pending`) with its `order_items`, inserts a `pending` payment and returns a Stripe (or mock) URL.
4. **Payment** — on success the payment row becomes `paid`. That's the POD booking: nothing is deducted from stock, the order is just logged.
5. **Dashboard** — lists paid orders with thumbnails and status (`pending → in_production → shipped → delivered`), plus billing history. **Order detail** shows items, price breakdown, shipping, payment, and can reload each item's saved design back into a read-only 3D viewer.

Unpaid (abandoned) orders are kept in the DB but hidden from the dashboard because the list query joins on `payments.status = 'paid'`.

---

## Style variants

The customizer has a **Style** section next to colour and size:

| Product | Option | Values (surcharge) | What changes in 3D |
|---------|--------|--------------------|--------------------|
| T-Shirt | Neckline | Round Neck · V-Neck · Polo Collar (+$3) | Rib torus ↔ V-shaped skin/rib patch ↔ collar flaps + placket + buttons |
| T-Shirt | Sleeves | Half Sleeve · Full Sleeve (+$4) | Short cylinders ↔ long cylinders with rib cuffs |
| Hoodie  | Type | Pullover · Zip-Up (+$6) | Kangaroo pocket ↔ zipper strip, pull tab, two side pockets |
| Hoodie  | Hood | Regular · Oversized | Hood mesh scaled up |

Implementation (`client/src/components/three/Garment.jsx`): one base torso per product, plus **swappable part meshes** that are mixed and matched — nothing is loaded per combination. Parts that must hug the body (V-neck, placket, zipper, pockets) are generated by `surfacePatch()`, which drapes a vertex grid over the torso's lathe profile, so they will need re-fitting if you swap in a GLTF torso with a different shape.

Uploaded prints still project onto the torso via `<Decal>` regardless of style. `decalDefaults()` in `client/src/lib/catalog.js` picks a sensible starting spot per style (lower for V-necks, left-chest logo for polos and zip-ups); a print the user has already dragged stays where it is when the style changes.

Style choices are stored on `order_items` (`neckline`, `sleeve_length`, `hoodie_type`, `hood_style`), re-priced server-side in `server/src/services/pricing.js`, and shown in the cart, checkout summary, dashboard cards and order detail (including the read-only 3D reload). Existing databases are upgraded in place by `npm run db:setup` (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`); run `npm run db:reset` to re-seed demo orders that use the new styles.

---

## 3D models — placeholder, swap me

**No downloaded GLTF/GLB is bundled.** The t-shirt and hoodie in `client/src/components/three/Garment.jsx` are built from Three.js primitives (a lathed torso flattened on Z, cylinder sleeves, torus collar; the hoodie adds a hemisphere hood, lathe pocket and drawstrings). This keeps the repo dependency-free and lets the full 360° + decal pipeline work out of the box.

To drop in a real model:

1. Put your file in `client/public/models/tshirt.glb` (and `hoodie.glb`).
2. In `Garment.jsx`, replace the `<mesh geometry={torso}>` block with the loaded mesh, e.g.

   ```jsx
   import { useGLTF } from '@react-three/drei';
   const { nodes } = useGLTF('/models/tshirt.glb');
   <mesh geometry={nodes.Shirt.geometry} castShadow>
     <meshStandardMaterial color={color} roughness={0.88} />
     {front?.url && <DesignDecal … />}
   </mesh>
   ```

3. Keep the `<Decal>` children inside that mesh — `DecalGeometry` projects onto whatever geometry its parent has.
4. Adjust `FRONT_Z` (distance from the model's origin to the chest surface) and the slider ranges in `Customizer.jsx` to match the model's scale. Delete the `Sleeve` / `Collar` / `HoodieParts` helpers if the model already includes them.

Good free sources: Sketchfab (filter by CC licence + downloadable), Poly Pizza, Quaternius.

---

## Storage — moving off local disk

Everything that touches the filesystem is in `server/services/storage.js`:

- `multerStorage(folder)` — returns a Multer storage engine (`multer.diskStorage` today; use `multer-s3` or memory storage + Cloudinary upload).
- `saveBuffer(buffer, ext, folder)` — used for thumbnails.
- `publicUrl(folder, filename)` — what gets stored in the DB.

Return absolute URLs from `publicUrl` and nothing else in the app needs to change (the Stripe line-item image field only accepts absolute URLs, so it will start working too).

---

## Database schema

```
users        (id, name, email, password_hash, created_at)
orders       (id, user_id, status, subtotal, shipping_cost, total_price, shipping_address JSONB, created_at)
order_items  (id, order_id, product_type, color, size, design_image_url, back_design_image_url,
              design_config JSONB, thumbnail_url, price, quantity)
payments     (id, order_id, stripe_payment_id, stripe_session_id, amount, currency, status, created_at)
```

`design_config` stores `{ front: {x, y, scale, rotation}, back: {...} | null }` so an order's design can be reloaded into the viewer exactly as it was placed.

---

## Notes / known limitations

- `bcryptjs` is used instead of native `bcrypt` to avoid a native build step on Windows; the API is identical.
- Order status changes (`in_production`, `shipped`, …) have no admin UI — update `orders.status` directly in the DB, or add an admin route.
- Uploads are accepted from anonymous users so the customizer works before login; add `requireAuth` to `routes/upload.js` if you want to restrict that.
- Cart lives in `localStorage` (per browser). Move it server-side if you need cross-device carts.
