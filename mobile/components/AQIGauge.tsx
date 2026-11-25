import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { getCategoryMeta } from '../constants/aqi';

interface Props {
  aqi: number;
  category: string;
  size?: number;
}

export function AQIGauge({ aqi, category, size = 240 }: Props) {
  const meta = getCategoryMeta(category);
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const progress = Math.min(aqi / 500, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={meta.hex} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={meta.hex} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#E8E8E8" strokeWidth={strokeWidth} fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={`url(#grad)`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.icon}>{meta.icon}</Text>
        <Text style={[styles.value, { color: meta.hex }]}>{aqi}</Text>
        <Text style={styles.label}>AQI</Text>
        <View style={[styles.badge, { backgroundColor: meta.hex + '25', borderColor: meta.hex + '60' }]}>
          <Text style={[styles.badgeText, { color: meta.textColor }]}>{meta.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 30, marginBottom: 2 },
  value: { fontSize: 60, fontWeight: '900', letterSpacing: -3, lineHeight: 64 },
  label: { fontSize: 12, color: '#AAAAAA', fontWeight: '700', letterSpacing: 3, marginBottom: 10 },
  badge: {
    paddingHorizontal: 16, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5,
  },
  badgeText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
