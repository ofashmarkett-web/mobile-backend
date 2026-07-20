import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { buyerApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import ChipGroup from "../../../components/vendor/ChipGroup";
import EmptyState from "../../../components/vendor/EmptyState";
import { priceLabel } from "../../../utils/format";

const OCCASIONS = ["Owambe", "Wedding", "Beach", "Casual", "Church", "Work & Office"];
const STYLES = ["Ankara", "Adire", "Aso-oke", "Lace", "Sequin", "Denim", "Tie-dye"];

// MVP spec: buyers filter by budget range, outfit type and event type.
const BuyerSearchTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const [q, setQ] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [occasion, setOccasion] = useState(null);
  const [style, setStyle] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  const results = useFetch(
    () =>
      buyerApi.browse(token, {
        q: q.trim() || undefined,
        budgetMin: budgetMin || undefined,
        budgetMax: budgetMax || undefined,
        occasion: occasion || undefined,
        style: style || undefined,
      }),
    [token, q, budgetMin, budgetMax, occasion, style],
  );

  const items = results.data?.products || [];

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SEARCH THE MARKET</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={COLORS.faint}
          value={q}
          onChangeText={setQ}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={() => setShowFilters((v) => !v)}>
          <Ionicons name="options-outline" size={20} color={COLORS.teal} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          showFilters ? (
            <View>
              <Text style={styles.filterLabel}>YOUR BUDGET (₦)</Text>
              <View style={styles.budgetRow}>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Min"
                  placeholderTextColor={COLORS.faint}
                  keyboardType="numeric"
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                />
                <Text style={styles.budgetDash}>—</Text>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Max"
                  placeholderTextColor={COLORS.faint}
                  keyboardType="numeric"
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                />
              </View>

              <Text style={styles.filterLabel}>EVENT</Text>
              <ChipGroup
                options={OCCASIONS}
                selected={occasion}
                single
                onToggle={(value) => setOccasion(occasion === value ? null : value)}
              />

              <Text style={styles.filterLabel}>OUTFIT TYPE</Text>
              <ChipGroup
                options={STYLES}
                selected={style}
                single
                onToggle={(value) => setStyle(style === value ? null : value)}
              />

              <Text style={[styles.filterLabel, { marginBottom: 4 }]}>
                {results.loading ? "SEARCHING..." : `${items.length} ITEM${items.length === 1 ? "" : "S"} FOUND`}
              </Text>
            </View>
          ) : results.loading ? (
            <ActivityIndicator color={COLORS.teal} style={{ marginVertical: 20 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
            activeOpacity={0.75}
          >
            <ProductThumb uri={(item.images || [])[0]} size={54} radius={12} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.store ? (
                <Text style={styles.resultStore} numberOfLines={1}>
                  {item.store.businessName}
                  {item.store.ratingCount > 0 ? `  ★ ${item.store.rating}` : ""}
                </Text>
              ) : null}
            </View>
            <Text style={styles.resultPrice}>{priceLabel(item)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !results.loading ? (
            <EmptyState
              icon="search-outline"
              title="No items match"
              subtitle="Try widening your budget or clearing a filter."
            />
          ) : null
        }
      />
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.ink,
    paddingVertical: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginTop: 14,
    marginBottom: 8,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  budgetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
  },
  budgetDash: { color: COLORS.muted },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  resultStore: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  resultPrice: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.teal,
  },
});

export default BuyerSearchTab;
