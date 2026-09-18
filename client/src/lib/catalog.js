export const PRODUCTS = {
  tshirt: { name: 'T-Shirt', price: 24.99, blurb: 'Classic crew neck, 100% ring-spun cotton' },
  hoodie: { name: 'Hoodie', price: 44.99, blurb: 'Heavyweight pullover with kangaroo pocket' },
};

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
export const SHIPPING_COST = 4.99;

// Mirrors server/src/services/pricing.js — the server re-prices every item.
export const STYLE_OPTIONS = {
  tshirt: [
    {
      key: 'neckline',
      label: 'Neckline',
      options: [
        { value: 'round', label: 'Round Neck', surcharge: 0 },
        { value: 'vneck', label: 'V-Neck', surcharge: 0 },
        { value: 'polo', label: 'Polo Collar', surcharge: 3 },
      ],
    },
    {
      key: 'sleeveLength',
      label: 'Sleeves',
      options: [
        { value: 'half', label: 'Half Sleeve', surcharge: 0 },
        { value: 'full', label: 'Full Sleeve', surcharge: 4 },
      ],
    },
  ],
  hoodie: [
    {
      key: 'hoodieType',
      label: 'Type',
      options: [
        { value: 'pullover', label: 'Pullover', surcharge: 0 },
        { value: 'zip', label: 'Zip-Up', surcharge: 6 },
      ],
    },
    {
      key: 'hoodStyle',
      label: 'Hood',
      options: [
        { value: 'regular', label: 'Regular', surcharge: 0 },
        { value: 'oversized', label: 'Oversized', surcharge: 0 },
      ],
    },
  ],
};

export const DEFAULT_STYLE = { neckline: 'round', sleeveLength: 'half', hoodieType: 'pullover', hoodStyle: 'regular' };

export function priceFor(productType, style = DEFAULT_STYLE) {
  let price = PRODUCTS[productType].price;
  for (const group of STYLE_OPTIONS[productType]) {
    const opt = group.options.find((o) => o.value === style[group.key]);
    if (opt) price += opt.surcharge;
  }
  return Math.round(price * 100) / 100;
}

// Accepts a cart item (camelCase) or an order_items row (snake_case).
export function styleOf(item) {
  return {
    neckline: item.neckline ?? undefined,
    sleeveLength: item.sleeveLength ?? item.sleeve_length ?? undefined,
    hoodieType: item.hoodieType ?? item.hoodie_type ?? undefined,
    hoodStyle: item.hoodStyle ?? item.hood_style ?? undefined,
  };
}

export function styleLabels(productType, style) {
  const labels = [];
  for (const group of STYLE_OPTIONS[productType] || []) {
    const opt = group.options.find((o) => o.value === style?.[group.key]);
    if (opt) labels.push(opt.label);
  }
  return labels;
}

export const COLORS = [
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Navy', hex: '#1f2a44' },
  { name: 'Red', hex: '#c0392b' },
  { name: 'Forest', hex: '#1e5631' },
  { name: 'Sand', hex: '#d8c3a5' },
  { name: 'Sky', hex: '#7cb9e8' },
  { name: 'Plum', hex: '#5b3a8a' },
];

export const DEFAULT_DECAL = { x: 0, y: 0.25, scale: 0.9, rotation: 0 };

// Where a freshly uploaded print lands for each style (V-necks and plackets eat into the chest area;
// zip-ups get a left-chest logo so the print doesn't straddle the zipper).
export function decalDefaults(productType, style = DEFAULT_STYLE) {
  if (productType === 'hoodie') {
    return style.hoodieType === 'zip' ? { x: 0.38, y: 0.3, scale: 0.5, rotation: 0 } : { ...DEFAULT_DECAL };
  }
  if (style.neckline === 'vneck') return { x: 0, y: 0.08, scale: 0.85, rotation: 0 };
  if (style.neckline === 'polo') return { x: 0.38, y: 0.35, scale: 0.4, rotation: 0 };
  return { ...DEFAULT_DECAL };
}

export const colorName = (hex) => COLORS.find((c) => c.hex.toLowerCase() === hex?.toLowerCase())?.name || 'Custom';

export const ORDER_STATUS = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  in_production: { label: 'In Production', className: 'bg-indigo-100 text-indigo-800' },
  shipped: { label: 'Shipped', className: 'bg-sky-100 text-sky-800' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800' },
};
export const ORDER_STATUS_STEPS = ['pending', 'in_production', 'shipped', 'delivered'];

export const PAYMENT_STATUS = {
  pending: { label: 'Awaiting payment', className: 'bg-zinc-100 text-zinc-700' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', className: 'bg-zinc-100 text-zinc-700' },
};
