import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useStations, Station } from '../../hooks/useStations';
import { useAppStore } from '../../store';

const { height } = Dimensions.get('window');

// ── Marker components ─────────────────────────────────────────────────────────

/**
 * VERIFIED STATION marker — solid filled circle with white border
 * Represents a real WAQI/CPCB monitoring network station
 */
function VerifiedMarker({ aqi, color }: { aqi: number | null; color: string }) {
  return (
    <View style={[verifiedStyles.outer, { borderColor: color }]}>
      <View style={[verifiedStyles.inner, { backgroundColor: color }]}>
        <Text style={verifiedStyles.aqi}>{aqi ?? '—'}</Text>
        <View style={verifiedStyles.dot} />
      </View>
    </View>
  );
}

const verifiedStyles = StyleSheet.create({
  outer: {
    borderWidth: 2.5,
    borderRadius: 24,
    padding: 2,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  inner: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  aqi: { color: '#fff', fontSize: 13, fontWeight: '900' },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#00C853',
  },
});

/**
 * MODEL GRID marker — rounded square, semi-transparent, dashed border
 * Represents Open-Meteo atmospheric model output — NOT a physical sensor
 */
function ModelMarker({ aqi, color }: { aqi: number | null; color: string }) {
  return (
    <View style={[modelStyles.outer, { borderColor: color }]}>
      <View style={[modelStyles.inner, { backgroundColor: color }]}>
        <Text style={modelStyles.aqi}>{aqi ?? '—'}</Text>
      </View>
    </View>
  );
}

const modelStyles = StyleSheet.create({
  outer: {
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed',
  },
  inner: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },
  aqi: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { t } = useTranslation();
  const { lat, lon, locationName } = useAppStore();
  const { data, isLoading, isError, refetch } = useStations(lat, lon, 40);
  const [selected, setSelected] = useState<Station | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showVerified, setShowVerified] = useState(true);

  const timeAgo = (ts: string | null) => {
    if (!ts) return 'Unknown';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Air Quality Map</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color="#00897B" />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
        </View>
        {data && (
          <View style={styles.countPills}>
            <View style={[styles.countPill, { borderColor: '#00897B' }]}>
              <View style={[styles.countDot, { backgroundColor: '#00897B' }]} />
              <Text style={styles.countText}>{data.verifiedCount} verified</Text>
            </View>
            <View style={[styles.countPill, { borderColor: '#1565C0' }]}>
              <View style={[styles.countDot, { backgroundColor: '#1565C0', borderRadius: 2 }]} />
              <Text style={styles.countText}>{data.gridCount} model</Text>
            </View>
          </View>
        )}
      </View>

      {/* Layer legend + toggles */}
      <View style={styles.legendRow}>
        <TouchableOpacity
          style={[styles.legendItem, showVerified && styles.legendItemActive]}
          onPress={() => setShowVerified(v => !v)}
          activeOpacity={0.7}
        >
          {/* Solid circle = verified */}
          <View style={[styles.legendIconCircle, { backgroundColor: '#00897B' }]}>
            <View style={styles.legendCircleDot} />
          </View>
          <View>
            <Text style={[styles.legendTitle, showVerified && { color: '#00897B' }]}>
              Verified Stations
            </Text>
            <Text style={styles.legendSub}>WAQI / CPCB network</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legendItem, showGrid && styles.legendItemModelActive]}
          onPress={() => setShowGrid(v => !v)}
          activeOpacity={0.7}
        >
          {/* Dashed square = model */}
          <View style={styles.legendIconSquare}>
            <View style={[styles.legendSquareFill, { backgroundColor: '#1565C0' }]} />
          </View>
          <View>
            <Text style={[styles.legendTitle, showGrid && { color: '#1565C0' }]}>
              Model Grid
            </Text>
            <Text style={styles.legendSub}>Open-Meteo forecast</Text>
          </View>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00897B" />
          <Text style={styles.loadingText}>Loading air quality map...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#BDBDBD" />
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: lat ?? 20.5937,
              longitude: lon ?? 78.9629,
              latitudeDelta: lat ? 0.7 : 15,
              longitudeDelta: lon ? 0.7 : 15,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {/* Search radius circle */}
            <Circle
              center={{ latitude: lat, longitude: lon }}
              radius={40000}
              strokeColor="#00897B33"
              fillColor="#00897B06"
              strokeWidth={1}
            />

            {/* MODEL GRID — rendered first (bottom layer) */}
            {showGrid && data?.gridPoints.map((s) => (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.lat, longitude: s.lon }}
                onPress={() => setSelected(s)}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <ModelMarker aqi={s.aqi} color={s.hexColor} />
              </Marker>
            ))}

            {/* VERIFIED STATIONS — rendered on top */}
            {showVerified && data?.stations.map((s) => (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.lat, longitude: s.lon }}
                onPress={() => setSelected(s)}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <VerifiedMarker aqi={s.aqi} color={s.hexColor} />
              </Marker>
            ))}
          </MapView>

          {/* Detail panel */}
          {selected ? (
            <View style={[
              styles.detailPanel,
              { borderTopColor: selected.hexColor },
              selected.type === 'model' && styles.detailPanelModel,
            ]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Ionicons name="close" size={20} color="#9E9E9E" />
              </TouchableOpacity>

              {/* Type badge */}
              <View style={[
                styles.typeBadge,
                { backgroundColor: selected.type === 'verified' ? '#E8F5E9' : '#E3F2FD' },
              ]}>
                <Ionicons
                  name={selected.type === 'verified' ? 'checkmark-circle' : 'cloud-outline'}
                  size={12}
                  color={selected.type === 'verified' ? '#00897B' : '#1565C0'}
                />
                <Text style={[
                  styles.typeBadgeText,
                  { color: selected.type === 'verified' ? '#00897B' : '#1565C0' },
                ]}>
                  {selected.type === 'verified'
                    ? 'Verified Monitoring Station'
                    : 'Atmospheric Model Data — not a physical sensor'}
                </Text>
              </View>

              {/* AQI hero row */}
              <View style={styles.heroRow}>
                <View style={[styles.aqiBubble, { borderColor: selected.hexColor }]}>
                  <Text style={[styles.aqiNum, { color: selected.hexColor }]}>
                    {selected.aqi ?? '—'}
                  </Text>
                  <Text style={styles.aqiLbl}>AQI</Text>
                </View>
                <View style={styles.heroMeta}>
                  <Text style={[styles.heroCategory, { color: selected.hexColor }]}>
                    {selected.category}
                  </Text>
                  <Text style={styles.heroName} numberOfLines={2}>{selected.name}</Text>
                  <View style={styles.heroTimeRow}>
                    <Ionicons name="time-outline" size={12} color="#9E9E9E" />
                    <Text style={styles.heroTime}>{timeAgo(selected.lastUpdated)}</Text>
                  </View>
                </View>
              </View>

              {/* Pollutant chips */}
              {(selected.pm25 != null || selected.pm10 != null) && (
                <View style={styles.pollutantRow}>
                  {selected.pm25 != null && (
                    <View style={styles.pollutantChip}>
                      <Text style={styles.pollutantLabel}>PM2.5</Text>
                      <Text style={styles.pollutantValue}>{selected.pm25}</Text>
                      <Text style={styles.pollutantUnit}>µg/m³</Text>
                    </View>
                  )}
                  {selected.pm10 != null && (
                    <View style={styles.pollutantChip}>
                      <Text style={styles.pollutantLabel}>PM10</Text>
                      <Text style={styles.pollutantValue}>{selected.pm10}</Text>
                      <Text style={styles.pollutantUnit}>µg/m³</Text>
                    </View>
                  )}
                  {(selected as any).no2 != null && (
                    <View style={styles.pollutantChip}>
                      <Text style={styles.pollutantLabel}>NO₂</Text>
                      <Text style={styles.pollutantValue}>{(selected as any).no2}</Text>
                      <Text style={styles.pollutantUnit}>µg/m³</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.sourceText}>Source: {selected.source}</Text>
            </View>
          ) : (
            /* Station list */
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Verified stations */}
              {data?.stations && data.stations.length > 0 && (
                <>
                  <View style={styles.listSectionHeader}>
                    <View style={[styles.listSectionDot, { backgroundColor: '#00897B', borderRadius: 6 }]} />
                    <Text style={styles.listSectionTitle}>
                      Verified Monitoring Stations ({data.verifiedCount})
                    </Text>
                  </View>
                  <Text style={styles.listSectionSub}>
                    WAQI / CPCB monitoring network
                  </Text>
                  {data.stations.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.listRow, styles.listRowVerified]}
                      onPress={() => setSelected(s)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.listAqi, { backgroundColor: s.hexColor }]}>
                        <Text style={styles.listAqiText}>{s.aqi ?? '—'}</Text>
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listName} numberOfLines={1}>{s.name}</Text>
                        <Text style={styles.listMeta}>
                          {s.category} · {timeAgo(s.lastUpdated)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color="#BDBDBD" />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Model grid */}
              {data?.gridPoints && data.gridPoints.length > 0 && (
                <>
                  <View style={[styles.listSectionHeader, { marginTop: 16 }]}>
                    <View style={[styles.listSectionDot, { backgroundColor: '#1565C0', borderRadius: 2 }]} />
                    <Text style={styles.listSectionTitle}>
                      Atmospheric Model Grid ({data.gridCount} points)
                    </Text>
                  </View>
                  <Text style={styles.listSectionSub}>
                    Open-Meteo forecast model · ~8km grid · Not physical sensors
                  </Text>
                  {data.gridPoints.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.listRow, styles.listRowModel]}
                      onPress={() => setSelected(s)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.listAqiSquare, { backgroundColor: s.hexColor }]}>
                        <Text style={styles.listAqiText}>{s.aqi ?? '—'}</Text>
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listName} numberOfLines={1}>
                          {(s as any).distKm != null
                            ? `${(s as any).distKm}km away`
                            : `${s.lat.toFixed(2)}°N, ${s.lon.toFixed(2)}°E`}
                        </Text>
                        <Text style={styles.listMeta}>
                          {s.category}
                          {s.pm25 != null ? ` · PM2.5: ${s.pm25}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color="#BDBDBD" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: 16,
    paddingTop: 10, paddingBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '900', color: '#212121' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 12, color: '#757575' },
  countPills: { flexDirection: 'row', gap: 6, paddingTop: 4 },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1,
  },
  countDot: { width: 8, height: 8 },
  countText: { fontSize: 11, color: '#424242', fontWeight: '600' },

  // Legend
  legendRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 6,
  },
  legendItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 1.5, borderColor: '#EEEEEE',
  },
  legendItemActive: { borderColor: '#00897B', backgroundColor: '#F1FBF5' },
  legendItemModelActive: { borderColor: '#1565C0', backgroundColor: '#EBF3FF' },
  legendIconCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  legendCircleDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff',
  },
  legendIconSquare: {
    width: 28, height: 28, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#1565C0',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  legendSquareFill: {
    width: 16, height: 16, borderRadius: 3, opacity: 0.6,
  },
  legendTitle: { fontSize: 12, fontWeight: '700', color: '#424242' },
  legendSub: { fontSize: 10, color: '#9E9E9E', marginTop: 1 },

  map: { height: height * 0.36 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#9E9E9E', fontSize: 14 },

  // Detail panel
  detailPanel: {
    backgroundColor: '#fff', margin: 10, borderRadius: 18,
    padding: 14, borderTopWidth: 3,
    borderWidth: 1, borderColor: '#EEEEEE',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
  },
  detailPanelModel: { borderStyle: 'solid' },
  closeBtn: { position: 'absolute', top: 12, right: 12 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 10 },
  aqiBubble: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, backgroundColor: '#FAFAFA',
  },
  aqiNum: { fontSize: 24, fontWeight: '900' },
  aqiLbl: { fontSize: 9, color: '#AAAAAA', fontWeight: '700', letterSpacing: 1 },
  heroMeta: { flex: 1 },
  heroCategory: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  heroName: { fontSize: 13, color: '#424242', fontWeight: '600', marginBottom: 4 },
  heroTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroTime: { fontSize: 12, color: '#9E9E9E' },
  pollutantRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pollutantChip: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: 8, alignItems: 'center',
  },
  pollutantLabel: { fontSize: 10, color: '#9E9E9E', fontWeight: '700' },
  pollutantValue: { fontSize: 17, fontWeight: '900', color: '#212121' },
  pollutantUnit: { fontSize: 9, color: '#BDBDBD' },
  sourceText: { fontSize: 10, color: '#BDBDBD', marginTop: 4 },

  // List
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 32 },
  listSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  listSectionDot: { width: 10, height: 10 },
  listSectionTitle: { fontSize: 13, fontWeight: '800', color: '#212121' },
  listSectionSub: { fontSize: 11, color: '#9E9E9E', marginBottom: 8, marginLeft: 18 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    marginBottom: 6, borderWidth: 1,
  },
  listRowVerified: { borderColor: '#E0F2E9' },
  listRowModel: { borderColor: '#E3EAF8', opacity: 0.9 },
  listAqi: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  listAqiSquare: {
    width: 42, height: 42, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.8,
  },
  listAqiText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  listInfo: { flex: 1 },
  listName: { fontSize: 13, fontWeight: '700', color: '#212121' },
  listMeta: { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
  retryBtn: {
    backgroundColor: '#00897B', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
