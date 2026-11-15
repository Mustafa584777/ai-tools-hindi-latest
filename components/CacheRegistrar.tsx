'use client';

import { useEffect } from 'react';

export default function CacheRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.warn('Service worker registration skipped:', err);
      });
  }, []);

  return null;
}
