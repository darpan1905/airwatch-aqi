import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import i18n from '../../lib/i18n';

const THRESHOLDS = [
  { value: 100, label: 'Satisfactory (100)', color: '#AEEA00' },
  { value: 150, label: 'Moderate (150)', color: '#FFD600' },
  { value: 200, label: 'Poor (200)', color: '#FF6D00' },
  { value: 300, label: 'Very Poor (300)', color: '#D50000' },
];

type Language = 'en' | 'hi' | 'mr';

export default function AlertsScreen() {
  const { t } = useTranslation();
  const {
    alertEnabled, setAlertEnabled,
    alertThreshold, setAlertThreshold,
    language, setLanguage,
    locationName,
  } = useAppStore();

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    Alert.alert(
      'Preferences Saved',
      `You'll be alerted when AQI exceeds ${alertThreshold} at ${locationName}.`,
      [{ text: 'OK' }]
    );
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const languages: { key: Language; label: string; native: string }[] = [
    { key: 'en', label: 'English', native: 'English' },
    { key: 'hi', label: 'Hindi', native: 'हिंदी' },
    { key: 'mr', label: 'Marathi', native: 'मराठी' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('alerts.title')}</Text>
        </View>

        {/* Alert toggle */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="notifications" size={20} color="#00897B" />
              </View>
              <View>
                <Text style={styles.rowTitle}>{t('alerts.enable')}</Text>
                <Text style={styles.rowSub}>Push alerts when AQI is unhealthy</Text>
              </View>
            </View>
            <Switch
              value={alertEnabled}
              onValueChange={setAlertEnabled}
              trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
              thumbColor={alertEnabled ? '#00897B' : '#BDBDBD'}
            />
          </View>
        </View>

        {/* Threshold selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alerts.threshold')}</Text>
          <View style={styles.thresholdGrid}>
            {THRESHOLDS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.thresholdBtn,
                  alertThreshold === item.value && {
                    borderColor: item.color,
                    backgroundColor: item.color + '18',
                  },
                ]}
                onPress={() => setAlertThreshold(item.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.thresholdDot, { backgroundColor: item.color }]} />
                <Text
                  style={[
                    styles.thresholdText,
                    alertThreshold === item.value && { color: '#212121', fontWeight: '700' },
                  ]}
                >
                  {item.label}
                </Text>
                {alertThreshold === item.value && (
                  <Ionicons name="checkmark-circle" size={16} color={item.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Alert location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alerts.location')}</Text>
          <View style={styles.locationCard}>
            <Ionicons name="location" size={18} color="#00897B" />
            <Text style={styles.locationText}>{locationName}</Text>
            <TouchableOpacity style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alerts.language')}</Text>
          <View style={styles.langRow}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.langBtn,
                  language === lang.key && styles.langBtnActive,
                ]}
                onPress={() => handleLanguageChange(lang.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.langText,
                    language === lang.key && styles.langTextActive,
                  ]}
                >
                  {lang.native}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnDone]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>
            {saved ? t('alerts.saved') : t('alerts.save')}
          </Text>
        </TouchableOpacity>

        {/* About section */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#1565C0" />
            <Text style={styles.aboutTitle}>{t('alerts.about')}</Text>
          </View>
          <Text style={styles.aboutText}>{t('alerts.aboutText')}</Text>
          <View style={styles.formulaBox}>
            <Text style={styles.formulaTitle}>AQI Interpolation Formula</Text>
            <Text style={styles.formula}>
              Iₚ = ((I_HI − I_LO) / (B_HI − B_LO)) × (Cₚ − B_LO) + I_LO
            </Text>
            <Text style={styles.formulaNote}>
              Final AQI = max of all pollutant sub-indices
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 20, paddingBottom: 50 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: '#212121', letterSpacing: -0.5 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#757575',
    letterSpacing: 0.5, marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#212121' },
  rowSub: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  thresholdGrid: { gap: 8 },
  thresholdBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#EEEEEE',
  },
  thresholdDot: { width: 10, height: 10, borderRadius: 5 },
  thresholdText: { flex: 1, fontSize: 14, color: '#757575', fontWeight: '500' },
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12,
  },
  locationText: { flex: 1, fontSize: 14, color: '#424242', fontWeight: '600' },
  changeBtn: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  changeBtnText: { fontSize: 12, color: '#00897B', fontWeight: '700' },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#F5F5F5',
    borderWidth: 1.5, borderColor: '#EEEEEE',
  },
  langBtnActive: {
    backgroundColor: '#E8F5E9', borderColor: '#00897B',
  },
  langText: { fontSize: 14, color: '#757575', fontWeight: '600' },
  langTextActive: { color: '#00897B', fontWeight: '800' },
  saveBtn: {
    backgroundColor: '#00897B', borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 20, elevation: 2,
  },
  saveBtnDone: { backgroundColor: '#43A047' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  aboutCard: {
    backgroundColor: '#E3F2FD', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#90CAF9',
  },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aboutTitle: { fontSize: 15, fontWeight: '800', color: '#1565C0' },
  aboutText: { fontSize: 13, color: '#1565C0', lineHeight: 20, marginBottom: 14 },
  formulaBox: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#90CAF9',
  },
  formulaTitle: { fontSize: 12, fontWeight: '700', color: '#757575', marginBottom: 8 },
  formula: {
    fontSize: 13, fontFamily: 'monospace', color: '#212121',
    fontWeight: '600', letterSpacing: 0.3, lineHeight: 20,
  },
  formulaNote: { fontSize: 11, color: '#9E9E9E', marginTop: 6 },
});
