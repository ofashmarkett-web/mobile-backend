import React from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { buyerApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StatusPill from "../../../components/vendor/StatusPill";
import EmptyState from "../../../components/vendor/EmptyState";
import { naira, priceLabel } from "../../../utils/format";

const CARD_WIDTH = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

// Subtle green trust badge for CAC-verified stores (matches StatusPill small).
const CacChip = () => (
  <View style={styles.cacChip}>
    <Ionicons name="shield-checkmark" size={10} color={COLORS.green} />
    <Text style={styles.cacChipText}>CAC Verified</Text>
  </View>
);

const BuyerHomeTab = ({ navigation, switchTab }) => {
  const token = useUserStore((state) => state.token);
  const me = useFetch(() => buyerApi.me(token).catch(() => null), [token]);
  const vendors = useFetch(() => buyerApi.vendors(token), [token]);
  const products = useFetch(() => buyerApi.browse(token, {}), [token]);

  const firstName = me.data?.profile?.fullName?.split(" ")[0];
  const loading = vendors.loading || products.loading;
  const items = products.data?.products || [];
  const stores = vendors.data?.vendors || [];

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>O-FASH MARKETT</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={products.refreshing}
            onRefresh={() => {
              vendors.refresh();
              products.refresh();
            }}
          />
        }
      >
        <Text style={styles.greeting}>
          {firstName ? `Hi ${firstName} 👋` : "Welcome to the market 👋"}
        </Text>
        <Text style={styles.subGreeting}>What are you wearing next?</Text>

        <TouchableOpacity style={styles.searchBar} onPress={() => switchTab("search")}>
          <Ionicons name="search-outline" size={18} color={COLORS.muted} />
          <Text style={styles.searchPlaceholder}>Search styles, stalls, budgets...</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={COLORS.teal} size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            {stores.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>RECOMMENDED STORES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.storesRow}>
                    {stores.map((store) => (
                      <View key={store.vendorId} style={styles.storeCard}>
                        {store.storeLogoUrl ? (
                          <ProductThumb uri={store.storeLogoUrl} size={44} radius={22} />
                        ) : (
                          <View style={styles.storeAvatar}>
                            <MaterialCommunityIcons
                              name="storefront-outline"
                              size={22}
                              color={COLORS.red}
                            />
                          </View>
                        )}
                        <Text style={styles.storeName} numberOfLines={1}>
                          {store.businessName}
                        </Text>
                        <View style={styles.storeRating}>
                          <Ionicons name="star" size={11} color={COLORS.star} />
                          <Text style={styles.storeRatingText}>
                            {store.ratingCount > 0 ? store.rating : "New"}
                          </Text>
                        </View>
                        <View style={styles.tagRow}>
                          {store.cacVerified ? <CacChip /> : null}
                          {store.tags.map((tag) => (
                            <StatusPill
                              key={tag}
                              label={tag}
                              color={tag === "Popular" ? COLORS.orange : COLORS.green}
                              bg={tag === "Popular" ? COLORS.orangeSoft : COLORS.greenSoft}
                              small
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>FRESH FROM THE MARKET</Text>
            {items.length === 0 ? (
              <EmptyState
                icon="storefront-outline"
                title="Stalls are setting up"
                subtitle="No live listings right now. Check back soon — vendors are stocking their stores."
              />
            ) : (
              <View style={styles.grid}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.productCard}
                    onPress={() =>
                      navigation.navigate("ProductDetail", { productId: item.id })
                    }
                    activeOpacity={0.8}
                  >
                    <ProductThumb
                      uri={(item.images || [])[0]}
                      size={CARD_WIDTH - 20}
                      radius={12}
                    />
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.productPrice}>{priceLabel(item)}</Text>
                    {item.store ? (
                      <Text style={styles.productStore} numberOfLines={1}>
                        {item.store.businessName}
                        {item.store.ratingCount > 0 ? `  ★ ${item.store.rating}` : ""}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  header: {
    alignItems: "center",
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  greeting: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 6,
  },
  subGreeting: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: COLORS.muted,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginBottom: 10,
    marginTop: 4,
  },
  storesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  storeCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  storeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  storeRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  storeRatingText: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: "600",
  },
  tagRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  cacChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cacChipText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.green,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 10,
    ...SHADOWS.card,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
    marginTop: 8,
  },
  productPrice: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.teal,
    marginTop: 2,
  },
  productStore: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },
});

export default BuyerHomeTab;
