import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { disputeApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import ProductThumb from "../../components/vendor/ProductThumb";
import StatusPill from "../../components/vendor/StatusPill";
import EmptyState from "../../components/vendor/EmptyState";
import { DISPUTE_STATUS_META, timeAgo } from "../../utils/format";

const SEGMENTS = [
  { key: "active", label: "Active" },
  { key: "resolved", label: "Resolved" },
];

const EMPTY_STATES = {
  active: {
    icon: "shield-checkmark-outline",
    title: "No active disputes",
    subtitle: "When a buyer raises an issue with an order, it shows up here.",
  },
  resolved: {
    icon: "shield-checkmark-outline",
    title: "No resolved disputes yet",
    subtitle: "Disputes that have been settled will show up here.",
  },
};

const DisputesScreen = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const [segment, setSegment] = useState("active");
  const result = useFetch(() => disputeApi.vendorList(token, segment), [token, segment]);

  const disputes = result.data?.disputes || [];
  const empty = EMPTY_STATES[segment];

  const renderItem = ({ item }) => {
    const meta = DISPUTE_STATUS_META[item.status] || DISPUTE_STATUS_META.submitted;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("VendorDisputeDetail", { disputeId: item.id })}
        activeOpacity={0.75}
      >
        <ProductThumb uri={item.productImageUrl} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={styles.buyerName} numberOfLines={1}>
            {item.buyerName}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <StatusPill label={meta.label} color={meta.color} bg={meta.bg} dot={meta.dot} small />
          <Text style={styles.filedAt}>Filed {timeAgo(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DISPUTES</Text>
        <TouchableOpacity
          style={styles.closeCircle}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="close" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.segmentTrack}>
        {SEGMENTS.map((item) => {
          const active = segment === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setSegment(item.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={disputes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={result.refreshing} onRefresh={result.refresh} />
        }
        ListHeaderComponent={
          result.loading ? <ActivityIndicator color={COLORS.teal} style={{ marginTop: 40 }} /> : null
        }
        ListEmptyComponent={
          !result.loading ? (
            <EmptyState icon={empty.icon} title={empty.title} subtitle={empty.subtitle} />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  closeCircle: {
    position: "absolute",
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentTrack: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  segmentTextActive: {
    color: COLORS.ink,
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    ...SHADOWS.card,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  buyerName: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  filedAt: {
    fontSize: 10.5,
    color: COLORS.muted,
  },
});

export default DisputesScreen;
