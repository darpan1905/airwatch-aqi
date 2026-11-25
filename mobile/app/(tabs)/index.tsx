import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAQI } from '../../hooks/useAQI';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../store';
import { AQIGauge } from '../../components/AQIGauge';
import { PollutantCard } from '../../components/PollutantCard';
import { GuidanceCard } from '../../components/GuidanceCard';
import { getCategoryMeta, getAQIColor } from '../../constants/aqi';

const AQI_SCALE = [
  { label: 'Good', range: '0–50', color: '#00C853' },
  { label: 'Satisfactory', range: '51–100', color: '#AEEA00' },
  { label: 'Moderate', range: '101–200', color: '#FFD600' },
  { label: 'Poor', range: '201–300', color: '#FF6D00' },
  { label: 'Very Poor', range: '301–400', color: '#D50000' },
  { label: 'Severe', range: '401–500', color: '#6A0000' },
];

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { lat, lon, locationName } = useAppStore();
  const { isLoading: locationLoading, isDenied, isError: locationError } = useLocation();
  const { data, isLoading, isError, refetch, isRefetching } = useAQI(
    lat ?? 0,
    lon ?? 0,
  );
  const meta = data ? getCategoryMeta(data.category) : null;

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  if (locationLoading || (isLoading && lat !== null)) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#00897B" />
        <Text style={styles.loadingText}>
          {locationLoading ? 'Detecting your location...' : 'Fetching air quality data...'}
        </Text>
      </View>
    );
  }

  if (isDenied) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="location-outline" size={64} color="#BDBDBD" />
        <Text style={styles.errorTitle}>Location access needed</Text>
        <Text style={styles.errorSub}>
          AirWatch needs your location to show local air quality.
          Please allow location access in your device settings.
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => router.push('/city-search')}
        >
          <Text style={styles.retryText}>Search a city instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="warning-outline" size={64} color="#BDBDBD" />
        <Text style={styles.errorTitle}>Could not get location</Text>
        <Text style={styles.errorSub}>GPS signal unavailable.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => router.push('/city-search')}
        >
          <Text style={styles.retryText}>Search a city instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="cloud-offline-outline" size={64} color="#BDBDBD" />
        <Text style={styles.errorTitle}>Could not load data</Text>
        <Text style={styles.errorSub}>Make sure your backend is running</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const aqiColor = getAQIColor(data.aqi);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={aqiColor} />}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky top bar */}
        <View style={styles.topBar}>
          <SafeAreaView edges={['top']}>
            <View style={styles.topBarInner}>
              <View style={styles.topBarLeft}>
                <Text style={styles.appName}>AirWatch</Text>
                <TouchableOpacity style={styles.locationBtn} onPress={() => router.push('/city-search')}>
                  <Ionicons name="location" size={13} color={aqiColor} />
                  <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
                  <Ionicons name="chevron-down" size={13} color="#9E9E9E" />
                </TouchableOpacity>
              </View>
              <View style={styles.topBarRight}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/city-search')}>
                  <Ionicons name="search-outline" size={20} color="#212121" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/alerts')}>
                  <Ionicons name="settings-outline" size={20} color="#212121" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: meta?.bg ?? '#F5F5F5' }]}>
          {/* Timestamp */}
          <View style={styles.timestampRow}>
            <View style={[styles.liveIndicator, { backgroundColor: aqiColor }]} />
            <Text style={styles.timestampText}>Updated {timeAgo(data.timestamp)}</Text>
          </View>

          {/* Gauge centred */}
          <View style={styles.gaugeWrap}>
            <AQIGauge aqi={data.aqi} category={data.category} size={230} />
          </View>

          {/* Prominent pollutant */}
          {data.prominentLabel && (
            <View style={styles.prominentRow}>
              <Text style={styles.drivenBy}>Driven by</Text>
              <View style={[styles.prominentChip, { backgroundColor: aqiColor + '20', borderColor: aqiColor + '50' }]}>
                <Text style={[styles.prominentChipText, { color: meta?.textColor }]}>{data.prominentLabel}</Text>
              </View>
            </View>
          )}

          {/* Standard note */}
          <Text style={styles.standardNote}>Calculated using Indian CPCB standard (IS 18020:2016)</Text>
        </View>

        {/* Guidance */}
        <View style={styles.section}>
          <GuidanceCard guidance={data.guidance} category={data.category} />
        </View>

        {/* Pollutant grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pollutants</Text>
            <Text style={styles.sectionSub}>Live readings</Text>
          </View>
          <View style={styles.pollutantGrid}>
            {data.pollutants.map((p) => (
              <PollutantCard key={p.key} pollutant={p} />
            ))}
          </View>
        </View>

        {/* AQI colour scale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AQI Scale — Indian CPCB</Text>
          <View style={styles.scaleCard}>
            {AQI_SCALE.map((item, i) => (
              <View
                key={item.label}
                style={[
                  styles.scaleRow,
                  data.category === item.label && styles.scaleRowActive,
                  i < AQI_SCALE.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
                ]}
              >
                <View style={[styles.scaleBar, { backgroundColor: item.color }]} />
                <Text style={[styles.scaleLabel, data.category === item.label && { fontWeight: '800', color: '#212121' }]}>
                  {item.label}
                </Text>
                <Text style={styles.scaleRange}>{item.range}</Text>
                {data.category === item.label && (
                  <View style={[styles.youAreHere, { backgroundColor: item.color }]}>
                    <Text style={styles.youAreHereText}>YOU</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F7' },
  loadingScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7F7F7', gap: 12,
  },
  loadingText: { fontSize: 15, color: '#757575', marginTop: 8 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#424242' },
  errorSub: { fontSize: 14, color: '#9E9E9E' },
  retryBtn: {
    marginTop: 8, backgroundColor: '#00897B',
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Top bar
  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    zIndex: 10,
  },
  topBarInner: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topBarLeft: { flex: 1 },
  appName: { fontSize: 22, fontWeight: '900', color: '#212121', letterSpacing: -0.5 },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, marginTop: 2,
  },
  locationText: { fontSize: 13, color: '#555', fontWeight: '500', maxWidth: 180 },
  topBarRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  heroCard: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 24, padding: 20,
    alignItems: 'center',
    elevation: 0,
  },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'flex-start' },
  liveIndicator: { width: 8, height: 8, borderRadius: 4 },
  timestampText: { fontSize: 12, color: '#757575', fontWeight: '500' },
  gaugeWrap: { marginVertical: 8 },
  prominentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  drivenBy: { fontSize: 13, color: '#757575' },
  prominentChip: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5,
  },
  prominentChipText: { fontSize: 13, fontWeight: '800' },
  standardNote: { fontSize: 11, color: '#AAAAAA', marginTop: 12, textAlign: 'center' },

  // Sections
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#212121' },
  sectionSub: { fontSize: 12, color: '#9E9E9E' },
  pollutantGrid: { gap: 0 },

  // Scale
  scaleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    marginTop: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  scaleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  scaleRowActive: { backgroundColor: '#FAFAFA' },
  scaleBar: { width: 14, height: 14, borderRadius: 4 },
  scaleLabel: { flex: 1, fontSize: 14, color: '#757575', fontWeight: '600' },
  scaleRange: { fontSize: 13, color: '#BDBDBD', fontWeight: '500' },
  youAreHere: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  youAreHereText: { fontSize: 9, color: '#fff', fontWeight: '900', letterSpacing: 1 },
});
