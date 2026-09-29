import { useEffect, useState } from 'react';
import { getPhotoUrls } from './api';

// Signed URLs last an hour; reuse them for 50 minutes across screens
const cache = new Map<string, { url: string; exp: number }>();

export function usePhotoUrls(paths: string[]) {
  const key = [...new Set(paths)].sort().join('|');
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!key) return;
    const need = key.split('|').filter((p) => {
      const c = cache.get(p);
      return !c || c.exp < Date.now();
    });
    if (!need.length) return;
    let alive = true;
    getPhotoUrls(need)
      .then((urls) => {
        const exp = Date.now() + 50 * 60 * 1000;
        for (const [p, url] of Object.entries(urls)) cache.set(p, { url, exp });
        if (alive) rerender((n) => n + 1);
      })
      .catch((e) => console.warn('Photo URLs failed:', e.message));
    return () => { alive = false; };
  }, [key]);

  return (path: string) => cache.get(path)?.url;
}
