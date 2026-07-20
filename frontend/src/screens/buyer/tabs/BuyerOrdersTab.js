import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../theme/colors";
import { buyerApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StatusPill from "../../../components/vendor/StatusPill";
import EmptyState from "../../../components/vendor/EmptyState";
import { naira, ORDER_STATUS_META } from "../../../utils/format";

// Buyer-facing labels for a couple of statuses that read differently on this side.
const BUYER_LABELS = { pending: "Awaiting vendor", ready_for_pickup: "Packaging" };

const BuyerOrdersTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const result = useFetch(() => buyerApi.orders(token), [token]);
  const orders = result.data?.orders || [];

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MY ORDERS</Text>
      </View>

      {result.loading ? (
        <ActivityIndicator color={COLORS.teal} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={result.refreshing} onRefresh={result.refresh} />
          }
          renderItem={({ item }) => {
            const meta = ORDER_STATUS_META[item.status] || ORDER_STATUS_META.pending;

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate("ActiveOrderTracking", { orderId: item.id })}
                activeOpacity={0.75}
              >
                <ProductThumb uri={item.productImageUrl} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={styles.orderNo}>#{item.orderNo}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{naira(item.orderAmount)}</Text>
                  <StatusPill
                    label={BUYER_LABELS[item.status] || meta.label}
                    color={meta.color}
                    bg={meta.bg}
                    small
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ marginTop: 60 }}>
              <EmptyState
                icon="basket-outline"
                title="No orders yet"
                subtitle="Find something you love in the market and it will show up here."
              />
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
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  orderNo: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  amount: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
});

export default BuyerOrdersTab;
