import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const t = useTheme();
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
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('📖') }} />
    </Tabs>
  );
}
