import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { SHADOWS } from "../../../theme/shadows";
import { vendorApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import WeekBarChart from "../../../components/vendor/WeekBarChart";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StatusPill from "../../../components/vendor/StatusPill";
import { naira } from "../../../utils/format";

const DAY_FULL = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const RANK_STYLES = [
  { label: "Top", color: COLORS.gold, bg: COLORS.goldSoft },
  { label: "2nd", color: COLORS.slate, bg: COLORS.grey },
  { label: "3rd", color: COLORS.orange, bg: COLORS.orangeSoft },
];

const AnalyticsTab = () => {
  const token = useUserStore((state) => state.token);
  const [period, setPeriod] = useState("week");
  const analytics = useFetch(() => vendorApi.analytics(token, period), [token, period]);

  const data = analytics.data;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ANALYTICS</Text>
        <TouchableOpacity style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={analytics.refreshing} onRefresh={analytics.refresh} />
        }
      >
        <View style={styles.segment}>
          {[
            { key: "week", label: "This week" },
            { key: "month", label: "This month" },
          ].map((option) => {
            const active = period === option.key;

            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setPeriod(option.key)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {analytics.loading ? (
          <ActivityIndicator color={COLORS.teal} style={{ marginTop: 60 }} size="large" />
        ) : analytics.error ? (
          <Text style={styles.errorText}>{analytics.error.message}</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>TOTAL REVENUE</Text>
              <Text style={styles.revenue}>{naira(data.totalRevenue)}</Text>
              {data.revenueChangePct != null ? (
                <Text
                  style={[
                    styles.changeText,
                    { color: data.revenueChangePct >= 0 ? COLORS.green : COLORS.red },
                  ]}
                >
                  {data.revenueChangePct >= 0 ? "+" : ""}
                  {data.revenueChangePct}% vs last {period}
                </Text>
              ) : null}

              <View style={{ marginTop: 16 }}>
                <WeekBarChart values={data.revenueByWeekday} labels={data.weekdayLabels} />
              </View>

              {data.insight?.bestOrdersDay ? (
                <View style={styles.insightNote}>
                  <Text style={styles.insightBold}>
                    {DAY_FULL[data.insight.bestOrdersDay] || data.insight.bestOrdersDay} had your
                    most orders.
                  </Text>
                  {data.insight.avgOrdersPerMonth > 0 ? (
                    <Text style={styles.insightSub}>
                      You averaged {data.insight.avgOrdersPerMonth} order
                      {data.insight.avgOrdersPerMonth === 1 ? "" : "s"} per month across the last 6
                      months
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.cardLabel}>ORDERS</Text>
                <Text style={styles.statValue}>{data.orders.total}</Text>
                <View style={styles.dotRow}>
                  <View style={[styles.dot, { backgroundColor: COLORS.green }]} />
                  <Text style={styles.dotText}>{data.orders.completed} completed</Text>
                  <View style={[styles.dot, { backgroundColor: COLORS.amber }]} />
                  <Text style={styles.dotText}>{data.orders.pending} pending</Text>
                </View>
              </View>

              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.cardLabel}>RATING</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.statValue}>
                    {data.rating.ratingCount > 0 ? data.rating.rating : "—"}
                  </Text>
                  <Ionicons name="star" size={18} color={COLORS.star} />
                </View>
                <Text style={styles.dotText}>
                  {data.rating.ratingCount > 0
                    ? `${data.rating.ratingCount} review${data.rating.ratingCount === 1 ? "" : "s"}`
                    : "No reviews yet"}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>TOP PERFORMING LISTINGS</Text>
              {data.topListings.length > 0 ? (
                data.topListings.map((listing, index) => {
                  const rank = RANK_STYLES[index] || RANK_STYLES[2];

                  return (
                    <View
                      key={listing.id}
                      style={[styles.topRow, index > 0 && styles.topRowDivider]}
                    >
                      <ProductThumb uri={listing.imageUrl} size={42} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.topName} numberOfLines={1}>
                          {listing.name}
                        </Text>
                        <Text style={styles.topMeta}>
                          {listing.unitsSold} order{listing.unitsSold === 1 ? "" : "s"} •{" "}
                          {listing.viewsCount} view{listing.viewsCount === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <StatusPill label={rank.label} color={rank.color} bg={rank.bg} small />
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>
                  Your best-performing items will rank here once buyers start viewing and ordering.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  bell: {
    position: "absolute",
    right: 16,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 999,
    padding: 4,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: COLORS.ink,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.slate,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  errorText: {
    color: COLORS.slate,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginBottom: 6,
  },
  revenue: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.ink,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  insightNote: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 12,
    marginTop: 8,
  },
  insightBold: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  insightSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.ink,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    flexWrap: "wrap",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotText: {
    fontSize: 11,
    color: COLORS.muted,
    marginRight: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  topRowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  topName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  topMeta: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12.5,
    color: COLORS.muted,
    lineHeight: 18,
  },
});

export default AnalyticsTab;
