import React, { useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { buyerApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import EmptyState from "../../../components/vendor/EmptyState";
import BuyerProductCard from "../../../components/buyer/ProductCardGrid";

const CARD_WIDTH = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

const BASE_CATEGORIES = ["Bags", "Shoes", "Blouse", "Ankara"];

// A product counts as women's/men's only when its own tags say so — we never
// fabricate a gender split.
const genderOf = (item) => {
  const tags = [...(item.occasionTags || []), ...(item.styleTags || [])].map((tag) =>
    String(tag).toLowerCase(),
  );
  if (tags.includes("women")) return "women";
  if (tags.includes("men")) return "men";
  return null;
};

const ProductGrid = ({ title, items, navigation }) => (
  <>
    {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
    <View style={styles.grid}>
      {items.map((item) => (
        <BuyerProductCard
          key={item.id}
          item={item}
          width={CARD_WIDTH}
          onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
        />
      ))}
    </View>
  </>
);

const BuyerCategoriesTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const [category, setCategory] = useState("All");

  const vendors = useFetch(() => buyerApi.vendors(token).catch(() => null), [token]);
  const products = useFetch(
    () => buyerApi.browse(token, category === "All" ? {} : { category }),
    [token, category],
  );

  // Pill row: fixed basics plus distinct categories from the recommended
  // vendors, deduped and capped.
  const pills = useMemo(() => {
    const vendorCategories = (vendors.data?.vendors || []).flatMap(
      (store) => store.categories || [],
    );
    const merged = [...BASE_CATEGORIES];
    vendorCategories.forEach((item) => {
      const name = String(item).trim();
      if (name && !merged.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        merged.push(name);
      }
    });
    return ["All", ...merged.slice(0, 8)];
  }, [vendors.data]);

  const items = products.data?.products || [];
  const women = items.filter((item) => genderOf(item) === "women");
  const men = items.filter((item) => genderOf(item) === "men");
  const canSplit = category !== "All" && women.length > 0 && men.length > 0;

  return (
    <View style={styles.flex}>
      <View style={styles.topPad}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate("BuyerSearch")}
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={18} color={COLORS.muted} />
          <Text style={styles.searchPlaceholder}>Search styles, stores, colours...</Text>
          <Ionicons name="camera-outline" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {pills.map((pill) => {
            const active = category === pill;
            return (
              <TouchableOpacity
                key={pill}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setCategory(pill)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{pill}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={products.refreshing} onRefresh={products.refresh} />
        }
      >
        {products.loading ? (
          <ActivityIndicator color={COLORS.teal} size="large" style={{ marginTop: 60 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="pricetags-outline"
            title="Nothing here yet"
            subtitle={
              category === "All"
                ? "No live listings right now. Check back soon."
                : `No ${category} listings right now. Try another category.`
            }
          />
        ) : canSplit ? (
          <>
            <ProductGrid
              title={`${category} for women`}
              items={women}
              navigation={navigation}
            />
            <ProductGrid title={`${category} for men`} items={men} navigation={navigation} />
          </>
        ) : (
          <ProductGrid
            title={category === "All" ? null : category}
            items={items}
            navigation={navigation}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  topPad: { paddingHorizontal: 16, paddingTop: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  pillText: {
    fontSize: 13,
    color: COLORS.slate,
  },
  pillTextActive: {
    color: COLORS.white,
    fontWeight: "700",
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 6,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
});

export default BuyerCategoriesTab;
