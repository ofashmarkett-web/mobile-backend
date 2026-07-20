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
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { SHADOWS } from "../../../theme/shadows";
import { productApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StatusPill from "../../../components/vendor/StatusPill";
import EmptyState from "../../../components/vendor/EmptyState";
import StockSheet from "../../../components/vendor/StockSheet";
import { naira, priceLabel, stockLine, STOCK_STATUS_META } from "../../../utils/format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "out_of_stock", label: "Out of stock" },
];

const countFor = (counts = {}, key) =>
  ({ all: counts.all, active: counts.active, out_of_stock: counts.outOfStock }[key] ?? 0);

const ListingsTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const [filter, setFilter] = useState("all");
  const listings = useFetch(() => productApi.mine(token, filter), [token, filter]);
  const [stockProduct, setStockProduct] = useState(null);

  const counts = listings.data?.counts;
  const products = listings.data?.products || [];
  const storeIsEmpty = !listings.loading && counts && counts.all === 0;

  const renderItem = ({ item }) => {
    const stockMeta = STOCK_STATUS_META[item.stockStatus];

    return (
      <TouchableOpacity
        style={styles.rowCard}
        onPress={() => navigation.navigate("VendorProductDetail", { productId: item.id })}
        activeOpacity={0.75}
      >
        <ProductThumb uri={(item.images || [])[0]} size={50} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isBestSeller ? (
              <StatusPill label="BEST SELLER" color={COLORS.green} bg={COLORS.greenSoft} small />
            ) : null}
            {item.isTrending ? (
              <StatusPill label="TRENDING" color={COLORS.gold} bg={COLORS.goldSoft} small />
            ) : null}
          </View>
          <TouchableOpacity onPress={() => setStockProduct(item)} hitSlop={8}>
            <Text style={styles.units}>{stockLine(item)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{priceLabel(item)}</Text>
          <Text style={[styles.stockStatus, { color: stockMeta.color }]}>{stockMeta.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LISTINGS</Text>
        <TouchableOpacity style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      {storeIsEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Your store has no items yet."
            subtitle="Add your first listing and buyers can start finding you."
          />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={listings.refreshing} onRefresh={listings.refresh} />
          }
          ListHeaderComponent={
            <>
              <Text style={styles.title}>Store listings</Text>
              <View style={styles.filters}>
                {FILTERS.map((tab) => {
                  const active = filter === tab.key;
                  const count = countFor(counts, tab.key);

                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.filter, active && styles.filterActive]}
                      onPress={() => setFilter(tab.key)}
                    >
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>
                        {tab.label}
                        {counts ? ` (${count})` : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {listings.loading ? (
                <ActivityIndicator color={COLORS.teal} style={{ marginTop: 40 }} />
              ) : null}
            </>
          }
          ListEmptyComponent={
            !listings.loading ? (
              <EmptyState
                title="Nothing here"
                subtitle={
                  filter === "out_of_stock"
                    ? "No items are out of stock."
                    : "No listings match this filter."
                }
              />
            ) : null
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddListing")}
        accessibilityLabel="Add a new listing"
      >
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

      <StockSheet
        product={stockProduct}
        visible={Boolean(stockProduct)}
        onClose={() => setStockProduct(null)}
        onSaved={() => listings.refresh()}
      />
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
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 8,
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filter: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  filterText: {
    fontSize: 12.5,
    color: COLORS.slate,
  },
  filterTextActive: {
    color: COLORS.tealDark,
    fontWeight: "700",
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
    flexShrink: 1,
  },
  units: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  right: {
    alignItems: "flex-end",
    gap: 3,
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
  },
  stockStatus: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.fab,
  },
});

export default ListingsTab;
