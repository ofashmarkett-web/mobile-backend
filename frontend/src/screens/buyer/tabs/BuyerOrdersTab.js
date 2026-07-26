import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { buyerApi, disputeApi, reviewApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StatusPill from "../../../components/vendor/StatusPill";
import EmptyState from "../../../components/vendor/EmptyState";
import { naira, DISPUTE_STATUS_META, ORDER_STATUS_META } from "../../../utils/format";

// Buyer-facing labels for a couple of statuses that read differently on this side.
const BUYER_LABELS = { pending: "Awaiting vendor", ready_for_pickup: "Packaging" };

const TABS = ["All", "Processing", "Shipped", "Delivered", "Returns"];

const STATUS_BUCKETS = {
  Processing: ["pending", "packaging", "ready_for_pickup"],
  Shipped: ["shipped"],
  Delivered: ["delivered", "completed"],
};

const EMPTY_COPY = {
  All: {
    title: "No Orders yet",
    subtitle: "Once you start shopping, your orders will show up here.",
  },
  Processing: {
    title: "No Processing orders",
    subtitle: "You don't have any processing orders yet",
  },
  Shipped: { title: "No Shipped orders", subtitle: "You don't have any shipped orders yet" },
  Delivered: { title: "No Delivered orders", subtitle: "You don't have any delivered orders yet" },
  Returns: { title: "No Return orders", subtitle: "You don't have any orders to return" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Mockup-style short date for section headers: "Jun 12, 2026".
const shortDate = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return `${MONTHS[date.getMonth()]} ${`${date.getDate()}`.padStart(2, "0")}, ${date.getFullYear()}`;
};

// Which header an order groups under, and off which timestamp.
const groupInfoFor = (order) => {
  if (["delivered", "completed"].includes(order.status)) {
    return { prefix: "Delivered", at: order.deliveredAt || order.createdAt };
  }
  if (order.status === "shipped") {
    return { prefix: "Shipped", at: order.pickedUpAt || order.createdAt };
  }
  return { prefix: "Placed", at: order.createdAt };
};

const matchesSearch = (query, ...fields) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(field || "").toLowerCase().includes(needle));
};

// ——— Module-scope row components (defining these inline would remount on every render) ———

const SectionHeader = ({ title, count }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count > 3 ? <Text style={styles.seeAll}>See all</Text> : null}
  </View>
);

const OrderRow = ({ order, onPress }) => {
  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <ProductThumb uri={order.productImageUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {order.productName}
        </Text>
        <View style={styles.subRow}>
          <Text style={styles.qty}>Qty: {order.quantity}</Text>
          <StatusPill
            label={BUYER_LABELS[order.status] || meta.label}
            color={meta.color}
            bg={meta.bg}
            small
          />
        </View>
      </View>
      <Text style={styles.amount}>{naira(order.orderAmount)}</Text>
    </TouchableOpacity>
  );
};

const ReviewRow = ({ order, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
    <ProductThumb uri={order.productImageUrl} size={48} />
    <View style={{ flex: 1 }}>
      <Text style={styles.name} numberOfLines={1}>
        {order.productName}
      </Text>
      <View style={styles.subRow}>
        <Text style={styles.qty}>Qty: {order.quantity}</Text>
        <StatusPill label="Ready for review" color={COLORS.gold} bg={COLORS.goldSoft} small />
      </View>
    </View>
    <View style={styles.reviewCta}>
      <Ionicons name="star-outline" size={13} color={COLORS.teal} />
      <Text style={styles.reviewCtaText}>Review</Text>
    </View>
  </TouchableOpacity>
);

const DisputeRow = ({ dispute, onPress }) => {
  const meta = DISPUTE_STATUS_META[dispute.status] || DISPUTE_STATUS_META.submitted;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <ProductThumb uri={dispute.productImageUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {dispute.productName}
        </Text>
        <View style={styles.subRow}>
          <Text style={styles.qty}>Qty: {dispute.quantity || 1}</Text>
          <StatusPill label={meta.label} color={meta.color} bg={meta.bg} dot={meta.dot} small />
        </View>
      </View>
      <Text style={styles.amount}>{naira(dispute.amountHeld)}</Text>
    </TouchableOpacity>
  );
};

const BuyerOrdersTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  const ordersResult = useFetch(() => buyerApi.orders(token), [token]);
  const disputesResult = useFetch(() => disputeApi.buyerList(token), [token]);
  const reviewedResult = useFetch(() => reviewApi.mine(token), [token]);

  const orders = ordersResult.data?.orders || [];
  const disputes = disputesResult.data?.disputes || [];
  const reviewedIds = useMemo(
    () => new Set(reviewedResult.data?.orderIds || []),
    [reviewedResult.data],
  );

  const refreshAll = () => {
    ordersResult.refresh();
    disputesResult.refresh();
    reviewedResult.refresh();
  };

  // Flattened list of {type: "header" | "order" | "review" | "dispute"} rows.
  const listData = useMemo(() => {
    const rows = [];

    if (tab === "Returns") {
      const visible = disputes.filter((dispute) =>
        matchesSearch(search, dispute.productName, dispute.orderNo),
      );
      const groups = new Map();
      visible.forEach((dispute) => {
        const key = `Returned ${shortDate(dispute.createdAt)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(dispute);
      });
      groups.forEach((items, title) => {
        rows.push({ type: "header", key: title, title, count: items.length });
        items.forEach((dispute) => rows.push({ type: "dispute", key: dispute.id, dispute }));
      });
      return rows;
    }

    const visible = orders.filter((order) =>
      matchesSearch(search, order.productName, order.orderNo),
    );

    let bucketed = visible;
    if (tab !== "All") {
      bucketed = visible.filter((order) => (STATUS_BUCKETS[tab] || []).includes(order.status));
    }

    // All tab leads with completed-but-unreviewed orders — tap goes straight
    // to the leave-review sheet.
    if (tab === "All") {
      const readyForReview = bucketed.filter(
        (order) => order.status === "completed" && !reviewedIds.has(order.id),
      );
      if (readyForReview.length) {
        rows.push({
          type: "header",
          key: "ready-for-review",
          title: `Ready for review (${readyForReview.length})`,
          count: readyForReview.length,
        });
        readyForReview.forEach((order) => rows.push({ type: "review", key: `rv-${order.id}`, order }));
        const reviewIds = new Set(readyForReview.map((order) => order.id));
        bucketed = bucketed.filter((order) => !reviewIds.has(order.id));
      }
    }

    const groups = new Map();
    bucketed.forEach((order) => {
      const info = groupInfoFor(order);
      const key = `${info.prefix} ${shortDate(info.at)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(order);
    });
    groups.forEach((items, title) => {
      rows.push({ type: "header", key: title, title, count: items.length });
      items.forEach((order) => rows.push({ type: "order", key: order.id, order }));
    });

    return rows;
  }, [tab, search, orders, disputes, reviewedIds]);

  const loading = ordersResult.loading || disputesResult.loading || reviewedResult.loading;
  const empty = EMPTY_COPY[tab];

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MY ORDERS</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Item name/Order ID/Tracking No"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={COLORS.faint} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((item) => {
            const active = tab === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setTab(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.teal} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={ordersResult.refreshing} onRefresh={refreshAll} />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <SectionHeader title={item.title} count={item.count} />;
            }
            if (item.type === "review") {
              return (
                <ReviewRow
                  order={item.order}
                  onPress={() =>
                    navigation.navigate("ActiveOrderTracking", {
                      orderId: item.order.id,
                      openReview: true,
                    })
                  }
                />
              );
            }
            if (item.type === "dispute") {
              return (
                <DisputeRow
                  dispute={item.dispute}
                  onPress={() =>
                    navigation.navigate("ActiveOrderTracking", { orderId: item.dispute.orderId })
                  }
                />
              );
            }
            return (
              <OrderRow
                order={item.order}
                onPress={() =>
                  navigation.navigate("ActiveOrderTracking", { orderId: item.order.id })
                }
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ marginTop: 40 }}>
              <EmptyState icon="cube-outline" title={empty.title} subtitle={empty.subtitle} />
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  header: { alignItems: "center", paddingVertical: 14 },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.ink, paddingVertical: 0 },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  tabPillActive: { backgroundColor: COLORS.tealSoft },
  tabText: { fontSize: 12.5, fontWeight: "600", color: COLORS.slate },
  tabTextActive: { color: COLORS.teal, fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  seeAll: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  subRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  qty: { fontSize: 11.5, color: COLORS.muted },
  amount: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  reviewCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewCtaText: { fontSize: 11.5, fontWeight: "700", color: COLORS.teal },
});

export default BuyerOrdersTab;
