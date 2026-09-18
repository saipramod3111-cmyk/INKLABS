import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SHIPPING_COST } from '../lib/catalog.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'inklabs_cart';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item) => setItems((prev) => [...prev, { id: crypto.randomUUID(), quantity: 1, ...item }]);
  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateQuantity = (id, quantity) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(50, quantity)) } : i)));
  const clear = () => setItems([]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping = items.length ? SHIPPING_COST : 0;
    return { subtotal, shipping, total: subtotal + shipping, count: items.reduce((s, i) => s + i.quantity, 0) };
  }, [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clear, ...totals }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
