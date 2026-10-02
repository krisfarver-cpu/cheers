import { supabase } from './supabase';
import { IS_IB } from './brand';

const PARTNER = 'indianabev';
let findItCache: string | null | undefined;

/** The partner's "Find it" link for a brand, or null. {brand} in the URL is replaced. */
export async function findItUrl(brand?: string | null): Promise<string | null> {
  if (!IS_IB) return null;
  if (findItCache === undefined) {
    const { data } = await supabase.from('partner_settings').select('find_it_url').eq('partner', PARTNER).maybeSingle();
    findItCache = data?.find_it_url ?? null;
  }
  if (!findItCache) return null;
  return findItCache.replace('{brand}', encodeURIComponent(brand ?? ''));
}

export type PartnerBrand = { id: string; name: string; category: string | null };

/** Brand suggestions from the partner's catalog as someone types. */
export async function searchBrands(q: string): Promise<PartnerBrand[]> {
  const term = q.trim().replace(/[%_,()]/g, '');
  if (!IS_IB || term.length < 2) return [];
  const { data } = await supabase.from('partner_brands').select('id, name, category')
    .eq('partner', PARTNER).ilike('name', `%${term}%`).order('name').limit(6);
  return (data ?? []) as PartnerBrand[];
}
