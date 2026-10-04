import { useCallback, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { BRAND, IS_IB } from '../lib/brand';
import { useTheme } from '../lib/theme';
import { track } from '../lib/analytics';

type Feature = { id: string; title: string; body: string | null; link_url: string | null };

/** "New this week" card for partner apps. Content lives in Supabase: partner_features. */
export function FeaturedCard() {
  const t = useTheme();
  const [f, setF] = useState<Feature | null>(null);
  useFocusEffect(useCallback(() => {
    if (!IS_IB) return;
    supabase.from('partner_features').select('id, title, body, link_url').eq('partner', 'indianabev')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        const feature = (data as Feature) ?? null;
        setF(feature);
        if (feature) track({ event: 'feature_view', feature_id: feature.id }, `view:${feature.id}`);
      });
  }, []));
  if (!IS_IB || !f) return null;
  return (
    <Pressable disabled={!f.link_url} onPress={() => { track({ event: 'feature_tap', feature_id: f.id }); if (f.link_url) Linking.openURL(f.link_url); }}
      style={({ pressed }) => ({ backgroundColor: '#0055A5', borderRadius: 18, padding: 16, marginTop: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>🍺</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>NEW THIS WEEK FROM {BRAND?.partnerName.toUpperCase()}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{f.title}</Text>
        {f.body ? <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{f.body}</Text> : null}
      </View>
      {f.link_url ? <Text style={{ color: '#FFFFFF', fontSize: 22 }}>›</Text> : null}
    </Pressable>
  );
}
