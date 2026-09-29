import * as Location from 'expo-location';

/**
 * Suggests a place name like "Harbor Tap Room, Seattle".
 * Coordinates stay on the device; only the name the person chooses is ever saved.
 */
export async function suggestPlaceName(): Promise<string | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const [p] = await Location.reverseGeocodeAsync(pos.coords);
  if (!p) return null;
  const place = p.name && p.name !== p.streetNumber ? p.name : p.street;
  return [place, p.city].filter(Boolean).join(', ').slice(0, 80) || null;
}
