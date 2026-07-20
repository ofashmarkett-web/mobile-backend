import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { orderApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StatusPill from "../../../components/vendor/StatusPill";
import EmptyState from "../../../components/vendor/EmptyState";
import { naira, ORDER_STATUS_META } from "../../../utils/format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "packaging", label: "Packaging" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
];

const OrdersTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const [filter, setFilter] = useState("all");
  const result = useFetch(() => orderApi.vendorList(token, filter), [token, filter]);

  const counts = result.data?.counts;
  const orders = result.data?.orders || [];
  const noOrdersAtAll = !result.loading && counts && counts.all === 0;

  const renderItem = ({ item }) => {
    const meta = ORDER_STATUS_META[item.status] || ORDER_STATUS_META.pending;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("VendorOrderDetail", { orderId: item.id })}
        activeOpacity={0.75}
      >
        <ProductThumb uri={item.productImageUrl} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={styles.buyer}>{item.buyerName}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{naira(item.orderAmount)}</Text>
          <StatusPill label={meta.label} color={meta.color} bg={meta.bg} small />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ORDERS</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate("VendorDisputes")}
            hitSlop={8}
          >
            <Ionicons name="shield-half-outline" size={21} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {noOrdersAtAll ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="basket-outline"
            title="No Orders yet"
            subtitle={"Once you start get orders for your products,\nthey'll show up here."}
          />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={result.refreshing} onRefresh={result.refresh} />
          }
          ListHeaderComponent={
            <>
              <Text style={styles.title}>Product orders</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
              >
                <View style={styles.filters}>
                  {FILTERS.map((tab) => {
                    const active = filter === tab.key;
                    const count = counts?.[tab.key];

                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.filter, active && styles.filterActive]}
                        onPress={() => setFilter(tab.key)}
                      >
                        <Text style={[styles.filterText, active && styles.filterTextActive]}>
                          {tab.label}
                          {count != null ? ` (${count})` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              {result.loading ? (
                <ActivityIndicator color={COLORS.teal} style={{ marginTop: 40 }} />
              ) : null}
            </>
          }
          ListEmptyComponent={
            !result.loading ? (
              <EmptyState
                icon="basket-outline"
                title="Nothing here"
                subtitle="No orders match this filter yet."
              />
            ) : null
          }
        />
      )}
    </View>
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
  headerRight: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 8,
    marginBottom: 12,
  },
  filtersScroll: {
    marginBottom: 14,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filter: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orangeSoft,
  },
  filterText: {
    fontSize: 12.5,
    color: COLORS.slate,
  },
  filterTextActive: {
    color: COLORS.orange,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingVertical: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  buyer: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
  },
});

export default OrdersTab;
