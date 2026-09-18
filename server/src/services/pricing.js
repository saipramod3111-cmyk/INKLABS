export const PRODUCTS = {
  tshirt: { name: 'T-Shirt', price: 24.99 },
  hoodie: { name: 'Hoodie', price: 44.99 },
};

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
export const SHIPPING_COST = 4.99;

// value -> surcharge. First entry of each group is the default. Mirrored in client/src/lib/catalog.js.
export const STYLE_OPTIONS = {
  tshirt: {
    neckline: { round: 0, vneck: 0, polo: 3 },
    sleeveLength: { half: 0, full: 4 },
  },
  hoodie: {
    hoodieType: { pullover: 0, zip: 6 },
    hoodStyle: { regular: 0, oversized: 0 },
  },
};

export const round2 = (n) => Math.round(n * 100) / 100;

export function normalizeStyle(productType, style = {}) {
  const out = {};
  for (const [key, options] of Object.entries(STYLE_OPTIONS[productType])) {
    const value = style?.[key] ?? Object.keys(options)[0];
    if (!(value in options)) throw Object.assign(new Error(`Invalid ${key} "${value}"`), { status: 400 });
    out[key] = value;
  }
  return out;
}

export function priceFor(productType, style) {
  let price = PRODUCTS[productType].price;
  for (const [key, options] of Object.entries(STYLE_OPTIONS[productType])) price += options[style[key]] || 0;
  return round2(price);
}
