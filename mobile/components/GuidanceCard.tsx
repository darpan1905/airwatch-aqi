import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getCategoryMeta } from '../constants/aqi';
import { useAppStore } from '../store';

interface Props {
  guidance: { en: string; hi: string; mr: string };
  category: string;
}

export function GuidanceCard({ guidance, category }: Props) {
  const { language } = useAppStore();
  const meta = getCategoryMeta(category);
  const text = guidance[language] ?? guidance.en;

  return (
    <View style={[styles.card, { backgroundColor: meta.bg, borderColor: meta.hex + '44' }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Text style={[styles.title, { color: meta.textColor }]}>What should you do?</Text>
      </View>
      <Text style={[styles.text, { color: meta.textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
});
