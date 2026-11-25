import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTrends, TrendWindow } from '../../hooks/useTrends';
import { useAppStore } from '../../store';
import { getAQIColor } from '../../constants/aqi';

const CHART_HEIGHT = 140;
const Y_AXIS_WIDTH = 36;
const BAR_GAP = 2;

type WindowTab = { key: TrendWindow; label: string };

export default function TrendsScreen() {
  const { t } = useTranslation();
  const { lat, lon, locationName, language } = useAppStore();
  const [activeWindow, setActiveWindow] = useState<TrendWindow>('d7');
  const [chartWidth, setChartWidth] = useState(0);
  const { data, isLoading, isError, refetch } = useTrends(lat, lon, activeWindow);
  const windows: WindowTab[] = [
    { key: 'h24', label: t('trends.h24') },
    { key: 'd7', label: t('trends.d7') },
    { key: 'd30', label: t('trends.d30') },
  ];

  const windowData = data?.windows?.[activeWindow];

  const directionIcon = (dir: string) => {
    if (dir === 'increasing') return { icon: 'trending-up' as const, color: '#D50000' };
    if (dir === 'decreasing') return { icon: 'trending-down' as const, color: '#00C853' };
    return { icon: 'remove' as const, color: '#FFD600' };
  };

  const handleChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const renderChart = () => {
    if (!data?.readings?.length || chartWidth === 0) return null;

    const now = Date.now();
    const windowMs: Record<TrendWindow, number> = {
      h24: 24 * 60 * 60 * 1000,
      d7: 7 * 24 * 60 * 60 * 1000,
      d30: 30 * 24 * 60 * 60 * 1000,
    };

    const filtered = data.readings
      .filter((r) => now - new Date(r.timestamp).getTime() <= windowMs[activeWindow])
      .slice(-48); // cap at 48 bars for readability

    if (filtered.length < 2) {
      return (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>Not enough data for this window</Text>
        </View>
      );
    }

    const aqis = filtered.map((r) => r.aqi);
    const minAqi = Math.max(0, Math.min(...aqis) - 10);
    const maxAqi = Math.max(...aqis) + 10;
    const range = maxAqi - minAqi || 1;

    const plotWidth = chartWidth - Y_AXIS_WIDTH;
    const barWidth = Math.max((plotWidth - BAR_GAP * filtered.length) / filtered.length, 2);

    const getY = (aqi: number) =>
      CHART_HEIGHT - ((aqi - minAqi) / range) * CHART_HEIGHT;

    // Y-axis gridlines at 3 levels
    const gridValues = [
      minAqi,
      Math.round(minAqi + range * 0.5),
      Math.round(maxAqi),
    ];

    return (
      <View onLayout={handleChartLayout}>
        <Svg width={chartWidth} height={CHART_HEIGHT + 20}>
          {/* Grid lines */}
          {gridValues.map((val, i) => {
            const y = getY(val);
            return (
              <G key={i}>
                <Line
                  x1={Y_AXIS_WIDTH}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#F0F0F0"
                  strokeWidth={1}
                />
                <SvgText
                  x={Y_AXIS_WIDTH - 4}
                  y={y + 4}
                  fontSize={9}
                  fill="#BBBBBB"
                  textAnchor="end"
                >
                  {val}
                </SvgText>
              </G>
            );
          })}

          {/* Bars */}
          {filtered.map((r, i) => {
            const barH = Math.max(((r.aqi - minAqi) / range) * CHART_HEIGHT, 3);
            const x = Y_AXIS_WIDTH + i * (barWidth + BAR_GAP);
            const y = CHART_HEIGHT - barH;
            const color = getAQIColor(r.aqi);

            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={color}
                opacity={0.85}
                rx={barWidth > 4 ? 2 : 0}
              />
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('trends.title')}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color="#9E9E9E" />
            <Text style={styles.location}>{locationName}</Text>
          </View>
        </View>

        {/* Window tabs */}
        <View style={styles.tabs}>
          {windows.map((w) => (
            <TouchableOpacity
              key={w.key}
              style={[styles.tab, activeWindow === w.key && styles.activeTab]}
              onPress={() => setActiveWindow(w.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeWindow === w.key && styles.activeTabText]}>
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color="#00897B" size="large" />
            <Text style={styles.loadingText}>{t('trends.loading')}</Text>
          </View>
        )}

        {isError && (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color="#BDBDBD" />
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && windowData && (
          <>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {language === 'hi'
                  ? windowData.summaryHi
                  : language === 'mr'
                  ? windowData.summaryMr
                  : windowData.summaryEn}
              </Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {[
                { label: t('trends.avg'), value: windowData.average },
                { label: t('trends.min'), value: windowData.min },
                { label: t('trends.max'), value: windowData.max },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[styles.statCard, { borderTopColor: getAQIColor(s.value) }]}
                >
                  <Text style={[styles.statValue, { color: getAQIColor(s.value) }]}>
                    {s.value}
                  </Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Direction card */}
            <View style={styles.dirCard}>
              {(() => {
                const { icon, color } = directionIcon(windowData.direction);
                return (
                  <>
                    <Ionicons name={icon} size={28} color={color} />
                    <View style={styles.dirText}>
                      <Text style={[styles.dirLabel, { color }]}>
                        {t(`trends.${windowData.direction}`)}
                      </Text>
                      <Text style={styles.dirSub}>
                        {Math.abs(windowData.changePercent)}% change over period
                      </Text>
                    </View>
                    <View style={[styles.pctBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.pctBadgeText, { color }]}>
                        {windowData.changePercent > 0 ? '+' : ''}
                        {windowData.changePercent}%
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>

            {/* SVG bar chart — uses onLayout so it never overflows */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>AQI over time</Text>
              <View
                style={styles.chartArea}
                onLayout={handleChartLayout}
              >
                {chartWidth > 0 && renderChart()}
              </View>
            </View>

            {/* Spike events */}
            <View style={styles.spikesCard}>
              <Text style={styles.spikesTitle}>
                {t('trends.spikes')} ({windowData.spikes.length})
              </Text>
              {windowData.spikes.length === 0 ? (
                <View style={styles.noSpikeRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#00C853" />
                  <Text style={styles.noSpikeText}>{t('trends.noSpikes')}</Text>
                </View>
              ) : (
                windowData.spikes.slice(0, 5).map((spike, i) => (
                  <View key={i} style={styles.spikeRow}>
                    <Ionicons
                      name={spike.type === 'spike_up' ? 'arrow-up-circle' : 'arrow-down-circle'}
                      size={20}
                      color={spike.type === 'spike_up' ? '#D50000' : '#00C853'}
                    />
                    <View style={styles.spikeInfo}>
                      <Text style={styles.spikeTime}>
                        {new Date(spike.timestamp).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text style={styles.spikeDetail}>
                        AQI {spike.fromAqi} → {spike.toAqi}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.spikePct,
                        { color: spike.type === 'spike_up' ? '#D50000' : '#00C853' },
                      ]}
                    >
                      {spike.changePercent > 0 ? '+' : ''}{spike.changePercent}%
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  scroll: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#212121', letterSpacing: -0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  location: { fontSize: 13, color: '#9E9E9E', fontWeight: '500' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  activeTab: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9E9E9E' },
  activeTabText: { color: '#00897B', fontWeight: '700' },

  centered: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { color: '#9E9E9E', fontSize: 14 },

  summaryCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    marginBottom: 12,
  },
  summaryText: { fontSize: 14, lineHeight: 22, color: '#1B5E20', fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600', marginTop: 2 },

  dirCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 12,
  },
  dirText: { flex: 1 },
  dirLabel: { fontSize: 15, fontWeight: '800' },
  dirSub: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pctBadgeText: { fontSize: 13, fontWeight: '800' },

  // Chart — key fix: chartArea fills the card width via flex, never overflows
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 12,
  },
  chartTitle: { fontSize: 13, fontWeight: '700', color: '#757575', marginBottom: 10 },
  chartArea: {
    width: '100%',
    overflow: 'hidden',
  },
  chartEmpty: { height: 60, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { color: '#BDBDBD', fontSize: 13 },

  spikesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  spikesTitle: { fontSize: 15, fontWeight: '800', color: '#212121', marginBottom: 12 },
  noSpikeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noSpikeText: { fontSize: 13, color: '#00C853', fontWeight: '500' },
  spikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  spikeInfo: { flex: 1 },
  spikeTime: { fontSize: 13, fontWeight: '600', color: '#424242' },
  spikeDetail: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  spikePct: { fontSize: 13, fontWeight: '800' },

  retryBtn: {
    backgroundColor: '#00897B',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
