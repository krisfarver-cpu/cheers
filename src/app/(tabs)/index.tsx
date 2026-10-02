import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Cheers, getReceived, subscribeToCheers } from '../../lib/api';
import { usePhotoUrls } from '../../lib/usePhotoUrls';
import { useTheme } from '../../lib/theme';
import { FriendsButton, Header } from '../../components/Header';
import { CheersCard } from '../../components/CheersCard';
import { ReceivedTile } from '../../components/ReceivedTile';
import { IB_GRID } from '../../lib/brand';
import { PrimaryButton } from '../../components/Buttons';

export default function Received() {
  const t = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Cheers[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getReceived());
    } catch (e: any) {
      Alert.alert('Couldn’t load your CHEERS!', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // New CHEERS! show up live while this screen is open
  useEffect(() => {
    let off: (() => void) | undefined;
    subscribeToCheers((_c, kind) => { if (kind === 'received') load(); }).then((f) => { off = f; });
    return () => off?.();
  }, [load]);

  const photo = usePhotoUrls(items.map((i) => i.photo_path));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <Header right={<FriendsButton onPress={() => router.push('/friends')} />} />
      <FlatList
        key={IB_GRID ? 'grid' : 'list'}
        numColumns={IB_GRID ? 2 : 1}
        columnWrapperStyle={IB_GRID ? { justifyContent: 'space-between' } : undefined}
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={<Text style={{ color: t.ink, fontSize: 24, fontWeight: '800', marginBottom: 4 }}>Received</Text>}
        renderItem={({ item }) => IB_GRID ? (
          <ReceivedTile cheers={item} photoUrl={photo(item.photo_path)} onPress={() => router.push(`/cheers/${item.id}`)} />
        ) : (
          <CheersCard cheers={item} photoUrl={photo(item.photo_path)} onPress={() => router.push(`/cheers/${item.id}`)} />
        )}
        ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
          <View style={{ paddingTop: 32, gap: 16 }}>
            <Text style={{ color: t.muted, fontSize: 16, lineHeight: 22 }}>
              No CHEERS! yet. Send one to a friend and they’ll probably send one back.
            </Text>
            <PrimaryButton title="Send a CHEERS!" onPress={() => router.navigate('/send')} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.accent}
          onRefresh={() => { setRefreshing(true); load(); }} />}
      />
    </SafeAreaView>
  );
}
