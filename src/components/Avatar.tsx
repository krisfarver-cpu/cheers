import { Text, View } from 'react-native';
import { colorFor } from '../lib/theme';

export function Avatar({ profile, size = 40 }: { profile: { id: string; display_name: string }; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(profile.id),
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontWeight: '800', fontSize: size * 0.42, color: '#2A1030' }}>
        {profile.display_name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
