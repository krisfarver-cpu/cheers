import { supabase } from './supabase';
import { IS_IB } from './brand';

type PartnerEvent = {
  event: 'find_it_click' | 'feature_view' | 'feature_tap';
  brand?: string | null;
  category?: string | null;
  feature_id?: string | null;
  cheers_id?: string | null;
};

const counted = new Set<string>();

/**
 * Logs a partner-app event for aggregate insights (see 013_insights.sql).
 * Fire-and-forget: never slows down or breaks the screen. onceKey limits an event to once per app session.
 */
export function track(e: PartnerEvent, onceKey?: string) {
  if (!IS_IB) return;
  if (onceKey) {
    if (counted.has(onceKey)) return;
    counted.add(onceKey);
  }
  supabase.from('analytics_events').insert({ partner: 'indianabev', ...e }).then(() => {}, () => {});
}
