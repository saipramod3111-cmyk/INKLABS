import { useEffect } from 'react';

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `InkLabs — ${title}` : 'InkLabs';
  }, [title]);
}
