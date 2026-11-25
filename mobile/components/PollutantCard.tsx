import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAQIColor } from '../constants/aqi';
import type { Pollutant } from '../hooks/useAQI';

interface Props {
  pollutant: Pollutant;
}

export function PollutantCard({ pollutant }: Props) {
  const { label, value, unit, subIndex, isProminent, referenceOnly } = pollutant;
  const color = subIndex ? getAQIColor(subIndex) : '#9E9E9E';
  const barWidth = subIndex ? Math.min((subIndex / 500) * 100, 100) : 0;

  return (
    <View style={[styles.card, isProminent && styles.prominentCard]}>
      {isProminent && (
        <View style={styles.prominentBadge}>
          <Text style={styles.prominentText}>PROMINENT</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color }]}>{value}</Text>
          <Text style={styles.unit}> {unit}</Text>
        </View>
      </View>
      {/* Sub-index bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${barWidth}%` as any, backgroundColor: color }]} />
      </View>
      {subIndex != null && (
        <Text style={[styles.subIndex, { color }]}>Sub-index: {subIndex}</Text>
      )}
      {referenceOnly && (
        <Text style={styles.referenceNote}>⚠ Reference only — 8h avg needed for Indian AQI</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  prominentCard: {
    borderColor: '#FF6D00',
    borderWidth: 2,
    backgroundColor: '#FFF8F5',
  },
  prominentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6D00',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  prominentText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
  },
  unit: {
    fontSize: 11,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  subIndex: {
    fontSize: 11,
    fontWeight: '600',
  },
  referenceNote: {
    fontSize: 10,
    color: '#F57F17',
    fontWeight: '500',
    marginTop: 4,
  },
});
