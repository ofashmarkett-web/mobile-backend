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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { SHADOWS } from "../../../theme/shadows";
import { vendorApi, productApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import Stars from "../../../components/vendor/Stars";
import StatusPill from "../../../components/vendor/StatusPill";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StockSheet from "../../../components/vendor/StockSheet";
import EmptyState from "../../../components/vendor/EmptyState";
import { naira, ORDER_STATUS_META } from "../../../utils/format";

const StoreAvatar = ({ uri }) => (
  <View style={styles.avatarWrap}>
    {uri ? (
      <ProductThumb uri={uri} size={72} radius={36} />
    ) : (
      <View style={styles.avatarFallback}>
        <MaterialCommunityIcons name="storefront-outline" size={34} color={COLORS.red} />
      </View>
    )}
  </View>
);

const attentionLine = (item) =>
  item.stockStatus === "out_of_stock"
    ? { text: "Out of Stock", color: COLORS.red }
    : {
        text: `Low Stock — ${item.stockQuantity} unit${item.stockQuantity === 1 ? "" : "s"} left`,
        color: COLORS.amber,
      };

const HomeTab = ({ navigation, switchTab }) => {
  const token = useUserStore((state) => state.token);
  const home = useFetch(() => vendorApi.home(token), [token]);
  const [restocking, setRestocking] = useState(null);

  const openRestock = async (item) => {
    try {
      const result = await productApi.get(token, item.id);
      setRestocking(result.product);
    } catch (error) {
      setRestocking({ ...item, images: item.imageUrl ? [item.imageUrl] : [] });
    }
  };

  if (home.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.teal} size="large" />
      </View>
    );
  }

  // Vendor exists but is not yet verified/approved — show the real pending state.
  if (home.error) {
    const pendingVerification = home.error.code === "VENDOR_NOT_VERIFIED";

    return (
      <ScrollView
        contentContainerStyle={styles.centerScroll}
        refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.refresh} />}
      >
        <EmptyState
          icon={pendingVerification ? "shield-checkmark-outline" : "cloud-offline-outline"}
          title={pendingVerification ? "Verification in progress" : "Couldn't load your store"}
          subtitle={
            pendingVerification
              ? "Your vendor account is awaiting verification. Your dashboard unlocks as soon as your KYC is approved."
              : home.error.message
          }
        />
      </ScrollView>
    );
  }

  const { store, insight, needsAttention = [], recentOrders = [], productCount = 0 } =
    home.data || {};
  const categoryLabel = (store?.categories || [])[0];
  const hasInsight = insight && (insight.viewsThisWeek > 0 || insight.viewsLastWeek > 0);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VENDOR DASHBOARD</Text>
        <TouchableOpacity style={styles.bell} onPress={() => navigation.navigate("VendorNotifications")}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.storeCard}>
          <StoreAvatar uri={store?.storeLogoUrl} />
          {store?.isLive ? (
            <View style={styles.liveChip}>
              <Text style={styles.liveText}>Live</Text>
            </View>
          ) : null}
          <Text style={styles.storeName}>{store?.businessName}</Text>
          <Text style={styles.storeMeta}>
            @{store?.storeHandle}
            {categoryLabel ? `  •  ${categoryLabel}` : ""}
          </Text>
          <View style={styles.ratingRow}>
            <Stars rating={store?.rating || 0} size={16} />
            <Text style={styles.ratingText}>
              {store?.ratingCount > 0
                ? `${store.rating} star rating${store.ratingCount === 1 ? "" : "s"}`
                : "No ratings yet"}
            </Text>
          </View>
          {store?.verification?.cacVerified ? (
            <View style={styles.cacChip}>
              <Ionicons name="shield-checkmark" size={12} color={COLORS.green} />
              <Text style={styles.cacChipText}>CAC Verified</Text>
            </View>
          ) : null}
        </View>

        {hasInsight ? (
          <View style={styles.insight}>
            <Ionicons name="flash" size={18} color={COLORS.blue} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>
                {insight.viewsChangePct != null
                  ? `Your store got ${Math.abs(insight.viewsChangePct)}% ${
                      insight.viewsChangePct >= 0 ? "more" : "fewer"
                    } views this week`
                  : `Your store got ${insight.viewsThisWeek} view${
                      insight.viewsThisWeek === 1 ? "" : "s"
                    } this week`}
              </Text>
              {insight.bestViewDay ? (
                <Text style={styles.insightSub}>
                  {insight.bestViewDay} was your best day. Keep new items coming to hold your
                  buyers' attention.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {needsAttention.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>NEEDS ATTENTION</Text>
            <View style={styles.card}>
              {needsAttention.map((item, index) => {
                const line = attentionLine(item);

                return (
                  <View
                    key={item.id}
                    style={[styles.row, index > 0 && styles.rowDivider]}
                  >
                    <ProductThumb uri={item.imageUrl} size={46} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      <Text style={[styles.rowSub, { color: line.color }]}>{line.text}</Text>
                    </View>
                    <TouchableOpacity onPress={() => openRestock(item)}>
                      <Text style={styles.restock}>Restock</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {recentOrders.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>RECENT ORDERS</Text>
            <View style={styles.card}>
              {recentOrders.map((order, index) => {
                const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;

                return (
                  <TouchableOpacity
                    key={order.id}
                    style={[styles.row, index > 0 && styles.rowDivider]}
                    onPress={() => navigation.navigate("VendorOrderDetail", { orderId: order.id })}
                  >
                    <ProductThumb uri={order.productImageUrl} size={46} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{order.productName}</Text>
                      <Text style={styles.rowSub}>{order.buyerName}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.amount}>{naira(order.orderAmount)}</Text>
                      <StatusPill label={meta.label} color={meta.color} bg={meta.bg} small />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {needsAttention.length === 0 && recentOrders.length === 0 ? (
          <View style={styles.card}>
            {productCount === 0 ? (
              <TouchableOpacity style={styles.emptyPrompt} onPress={() => switchTab("listings")}>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.teal} />
                <Text style={styles.emptyPromptText}>
                  Add your first listing so buyers can start finding your store.
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyPrompt}>
                <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.green} />
                <Text style={styles.emptyPromptText}>
                  {store?.isLive
                    ? `Your ${productCount} listing${productCount === 1 ? " is" : "s are"} live. Orders will show up here as they come in.`
                    : "Your listings are ready — turn on Store live mode in Profile so buyers can find you."}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <StockSheet
        product={restocking}
        visible={Boolean(restocking)}
        onClose={() => setRestocking(null)}
        onSaved={() => home.refresh()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerScroll: { flexGrow: 1, justifyContent: "center" },
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
  storeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  avatarWrap: {
    marginBottom: 4,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  liveChip: {
    marginTop: -12,
    backgroundColor: COLORS.green,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
  },
  storeName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 8,
  },
  storeMeta: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.slate,
  },
  cacChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    backgroundColor: COLORS.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cacChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.green,
  },
  insight: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.blueSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  insightSub: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 3,
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 18,
    ...SHADOWS.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.ink,
  },
  rowSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
  },
  restock: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.teal,
  },
  emptyPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  emptyPromptText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.slate,
    lineHeight: 18,
  },
});

export default HomeTab;
