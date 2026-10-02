import { useCallback, useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { countUnreadGroups, onGroupsChanged } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';

/** Number of groups with new drinks, kept fresh as things happen. */
function useUnreadGroups() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => { countUnreadGroups().then(setCount); }, []);
  useEffect(() => {
    refresh();
    const offGroups = onGroupsChanged(refresh);
    const appState = AppState.addEventListener('change', (st) => { if (st === 'active') refresh(); });
    // New group posts you can see (database rules only send you your own groups')
    const channel = supabase.channel(`group-badge-${Math.random().toString(36).slice(2, 6)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cheers' }, (p: any) => {
        if (p.new?.group_id) refresh();
      })
      .subscribe();
    return () => { offGroups(); appState.remove(); supabase.removeChannel(channel); };
  }, [refresh]);
  return count;
}

export default function TabsLayout() {
  const t = useTheme();
  const unreadGroups = useUnreadGroups();
  const icon = (emoji: string) => ({ focused }: { focused: boolean }) =>
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.ink,
      tabBarInactiveTintColor: t.muted,
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line },
      tabBarLabelStyle: { fontWeight: '600' },
      sceneStyle: { backgroundColor: t.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Received', tabBarIcon: icon('🍻') }} />
      <Tabs.Screen name="send" options={{
        title: 'Send',
        tabBarIcon: () => (
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginTop: -20 }}>
            <Text style={{ fontSize: 24 }}>📸</Text>
          </View>
        ),
      }} />
      <Tabs.Screen name="history" options={{
        title: 'History',
        tabBarIcon: icon('📖'),
        tabBarBadge: unreadGroups > 0 ? unreadGroups : undefined,
        tabBarBadgeStyle: { backgroundColor: t.accent, color: t.onAccent, fontWeight: '700' },
      }} />
    </Tabs>
  );
}
