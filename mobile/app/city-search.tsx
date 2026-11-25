import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useGeocode, useCityAQI } from '../hooks/useCityAQI';
import { AQIGauge } from '../components/AQIGauge';
import { PollutantCard } from '../components/PollutantCard';
import { GuidanceCard } from '../components/GuidanceCard';
import { getCategoryMeta } from '../constants/aqi';
import { useAppStore } from '../store';

export default function CitySearchScreen() {
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const { language } = useAppStore();

  const { data: suggestions, isFetching: geoLoading } = useGeocode(query);
  const { data: cityData, isLoading: aqiLoading, isError } = useCityAQI(selectedCity);

  const handleSelect = useCallback((name: string, state: string | null, country: string) => {
    const label = [name, state, country].filter(Boolean).join(', ');
    setSelectedLabel(label);
    setSelectedCity(name);
    setQuery('');
  }, []);

  const meta = cityData ? getCategoryMeta(cityData.category) : null;

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.title}>Search City</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#9E9E9E" />
            <TextInput
              style={styles.searchInput}
              placeholder="Mumbai, Delhi, Pune..."
              placeholderTextColor="#BDBDBD"
              value={query}
              onChangeText={(t) => { setQuery(t); setSelectedCity(null); }}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSelectedCity(null); }}>
                <Ionicons name="close-circle" size={18} color="#BDBDBD" />
              </TouchableOpacity>
            )}
          </View>
          {geoLoading && <ActivityIndicator size="small" color="#00897B" style={{ marginLeft: 10 }} />}
        </View>

        {/* Suggestions dropdown */}
        {query.length >= 2 && suggestions && suggestions.length > 0 && !selectedCity && (
          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.suggestionRow, i < suggestions.length - 1 && styles.suggestionBorder]}
                onPress={() => handleSelect(s.name, s.state, s.country)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color="#9E9E9E" />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionCity}>{s.name}</Text>
                  <Text style={styles.suggestionMeta}>
                    {[s.state, s.country].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {query.length >= 2 && suggestions?.length === 0 && !geoLoading && (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={32} color="#BDBDBD" />
            <Text style={styles.noResultsText}>No cities found for "{query}"</Text>
          </View>
        )}

        {/* AQI Result */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {aqiLoading && selectedCity && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#00897B" />
              <Text style={styles.loadingText}>Fetching AQI for {selectedCity}...</Text>
            </View>
          )}

          {isError && (
            <View style={styles.centered}>
              <Ionicons name="cloud-offline" size={40} color="#BDBDBD" />
              <Text style={styles.errorText}>Could not fetch AQI for this city</Text>
            </View>
          )}

          {cityData && !aqiLoading && (
            <>
              {/* City header */}
              <View style={[styles.cityHeader, meta && { backgroundColor: meta.bg }]}>
                <View>
                  <Text style={styles.cityName}>{cityData.cityName}</Text>
                  {cityData.state && (
                    <Text style={styles.cityMeta}>{cityData.state}, {cityData.country}</Text>
                  )}
                  <Text style={styles.cityTime}>{timeAgo(cityData.timestamp)}</Text>
                </View>
                <View style={[styles.standardBadge]}>
                  <Text style={styles.standardText}>Indian CPCB</Text>
                </View>
              </View>

              {/* Gauge */}
              <View style={styles.gaugeWrap}>
                <AQIGauge aqi={cityData.aqi} category={cityData.category} />
              </View>

              {/* Guidance */}
              <GuidanceCard guidance={cityData.guidance} category={cityData.category} />

              {/* Pollutants */}
              <Text style={styles.sectionTitle}>Pollutants</Text>
              {cityData.pollutants.map((p) => (
                <PollutantCard key={p.key} pollutant={p} />
              ))}
            </>
          )}

          {/* Quick city chips */}
          {!selectedCity && (
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>Popular Indian Cities</Text>
              <View style={styles.chips}>
                {['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad'].map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={styles.chip}
                    onPress={() => handleSelect(city, null, 'India')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#212121' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 4,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    borderWidth: 1.5, borderColor: '#00897B',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#212121', fontWeight: '500' },
  suggestions: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16,
    borderRadius: 14, borderWidth: 1, borderColor: '#EEEEEE',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    marginBottom: 8, overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestionText: { flex: 1 },
  suggestionCity: { fontSize: 15, fontWeight: '700', color: '#212121' },
  suggestionMeta: { fontSize: 12, color: '#9E9E9E', marginTop: 1 },
  noResults: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noResultsText: { color: '#9E9E9E', fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  centered: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { color: '#757575', fontSize: 14, textAlign: 'center' },
  errorText: { color: '#9E9E9E', fontSize: 14 },
  cityHeader: {
    borderRadius: 16, padding: 16, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  cityName: { fontSize: 24, fontWeight: '900', color: '#212121' },
  cityMeta: { fontSize: 13, color: '#757575', marginTop: 2 },
  cityTime: { fontSize: 12, color: '#9E9E9E', marginTop: 4 },
  standardBadge: {
    backgroundColor: '#E3F2FD', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  standardText: { fontSize: 11, color: '#1565C0', fontWeight: '700' },
  gaugeWrap: { alignItems: 'center', marginVertical: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#212121', marginBottom: 10, marginTop: 4 },
  quickSection: { marginTop: 8 },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#757575', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#EEEEEE',
    elevation: 1,
  },
  chipText: { fontSize: 13, color: '#212121', fontWeight: '600' },
});
