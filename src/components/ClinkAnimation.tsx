import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, WORDMARK_FONT } from '../lib/theme';

/** Plays the two-glasses clink every time `trigger` increases. */
export function ClinkAnimation({ trigger }: { trigger: number }) {
  const t = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    opacity.setValue(0); tilt.setValue(0); pop.setValue(0);
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), reduce ? 0 : 260);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: reduce ? 0 : 120, useNativeDriver: true }),
        Animated.parallel([
          reduce ? Animated.timing(tilt, { toValue: 1, duration: 0, useNativeDriver: true })
                 : Animated.spring(tilt, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(reduce ? 0 : 240),
            Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(800),
        Animated.timing(opacity, { toValue: 0, duration: reduce ? 0 : 250, useNativeDriver: true }),
      ]).start();
    });
    return () => { cancelled = true; };
  }, [trigger]);

  const lx = tilt.interpolate({ inputRange: [0, 1], outputRange: [-60, 6] });
  const lr = tilt.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '14deg'] });
  const rx = tilt.interpolate({ inputRange: [0, 1], outputRange: [60, -6] });
  const rr = tilt.interpolate({ inputRange: [0, 1], outputRange: ['25deg', '-14deg'] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, { opacity, zIndex: 50 }]}>
      <Animated.Text style={{ fontFamily: WORDMARK_FONT, fontSize: 56, color: t.accent, transform: [{ scale: pop }, { rotate: '-6deg' }] }}>
        CHEERS!
      </Animated.Text>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        <Animated.Text style={[styles.glass, { transform: [{ translateX: lx }, { rotate: lr }] }]}>🍺</Animated.Text>
        <Animated.Text style={[styles.glass, { transform: [{ translateX: rx }, { rotate: rr }, { scaleX: -1 }] }]}>🍺</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glass: { fontSize: 96 },
});
