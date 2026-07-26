import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { buyerApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import EmptyState from "../../components/vendor/EmptyState";
import BuyerProductCard from "../../components/buyer/ProductCardGrid";

const CARD_WIDTH = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

const BASE_CATEGORIES = ["Bags", "Shoes", "Blouse", "Ankara"];
const STYLE_TAGS = ["Ankara", "Adire", "Aso-oke", "Lace", "Sequin", "Denim", "Tie-dye"];

// Colour swatches for the filter sheet. "Multicolour" renders as a 2x2
// four-colour square instead of a single swatch.
const COLOUR_OPTIONS = [
  { name: "Black", hex: "#111111" },
  { name: "Brown", hex: "#7B4B27" },
  { name: "Red", hex: "#E53935" },
  { name: "Green", hex: "#2E7D32" },
  { name: "Yellow", hex: "#F9A825" },
  { name: "Blue", hex: "#1E88E5" },
  { name: "White", hex: "#FFFFFF", border: true },
  { name: "Multicolour", multi: true },
];

const MULTI_SQUARES = ["#E53935", "#F9A825", "#2E7D32", "#1E88E5"];

// Filter sections. "Band material" from the mockup is intentionally skipped:
// products carry no band-material data, so the filter would always be empty.
const FILTER_SECTIONS = ["Category", "Colour", "Style"];

const ColourSwatch = ({ option, active, onPress }) => (
  <TouchableOpacity style={styles.swatchWrap} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.swatchRing, active && styles.swatchRingActive]}>
      {option.multi ? (
        <View style={styles.multiSwatch}>
          {MULTI_SQUARES.map((hex) => (
            <View key={hex} style={[styles.multiSquare, { backgroundColor: hex }]} />
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.swatch,
            { backgroundColor: option.hex },
            option.border && styles.swatchBorder,
          ]}
        />
      )}
    </View>
    <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]} numberOfLines={1}>
      {option.name}
    </Text>
  </TouchableOpacity>
);

// Bottom-sheet filter card. Keeps a draft of the filters and only commits on
// "Apply" — "Reset" clears both draft and applied filters.
const FilterSheet = ({ visible, categories, filters, onApply, onClose }) => {
  const [section, setSection] = useState("Category");
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setSection("Category");
    }
  }, [visible, filters]);

  const toggle = (key, value) =>
    setDraft((current) => ({ ...current, [key]: current[key] === value ? null : value }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Filter by</Text>

          <View style={styles.sectionPillRow}>
            {FILTER_SECTIONS.map((name) => {
              const active = section === name;
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.sectionPill, active && styles.sectionPillActive]}
                  onPress={() => setSection(name)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.sectionPillText, active && styles.sectionPillTextActive]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {section === "Category" ? (
              <View style={styles.chipWrap}>
                {categories.map((name) => {
                  const active = draft.category === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggle("category", name)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {section === "Colour" ? (
              <View style={styles.swatchGrid}>
                {COLOUR_OPTIONS.map((option) => (
                  <ColourSwatch
                    key={option.name}
                    option={option}
                    active={draft.colour === option.name}
                    onPress={() => toggle("colour", option.name)}
                  />
                ))}
              </View>
            ) : null}

            {section === "Style" ? (
              <View style={styles.chipWrap}>
                {STYLE_TAGS.map((name) => {
                  const active = draft.style === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggle("style", name)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                const cleared = { category: null, colour: null, style: null };
                setDraft(cleared);
                onApply(cleared);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => onApply(draft)}
              activeOpacity={0.85}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BuyerSearchScreen = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const recentSearches = useUserStore((state) => state.buyerPrefs.recentSearches);
  const addRecentSearch = useUserStore((state) => state.addRecentSearch);

  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: null, colour: null, style: null });
  const [sheetOpen, setSheetOpen] = useState(false);

  const vendors = useFetch(() => buyerApi.vendors(token).catch(() => null), [token]);
  const results = useFetch(
    () =>
      buyerApi.browse(token, {
        q: query || undefined,
        category: filters.category || undefined,
        colour: filters.colour || undefined,
        style: filters.style || undefined,
      }),
    [token, query, filters],
  );

  const categories = useMemo(() => {
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
    return merged.slice(0, 8);
  }, [vendors.data]);

  const submit = () => {
    const cleaned = text.trim();
    setQuery(cleaned);
    if (cleaned) addRecentSearch(cleaned);
  };

  const runSuggested = (term) => {
    setText(term);
    setQuery(term);
  };

  const items = results.data?.products || [];
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <View style={styles.closeRow}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search styles, stores, colours..."
          placeholderTextColor={COLORS.faint}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="search"
          autoFocus
        />
        {text.length > 0 ? (
          <TouchableOpacity
            hitSlop={8}
            onPress={() => {
              setText("");
              setQuery("");
            }}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.faint} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterByRow}>
        <TouchableOpacity
          style={styles.filterByButton}
          onPress={() => setSheetOpen(true)}
          hitSlop={8}
        >
          <Text style={styles.filterByText}>
            Filter by{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
          <Ionicons name="options-outline" size={16} color={COLORS.teal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {recentSearches.length > 0 ? (
          <>
            <Text style={styles.suggestedLabel}>Suggested searches</Text>
            <View style={styles.suggestedWrap}>
              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.suggestedChip}
                  onPress={() => runSuggested(term)}
                  activeOpacity={0.8}
                >
                  <View style={styles.suggestedDot} />
                  <Text style={styles.suggestedText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {results.loading ? (
          <ActivityIndicator color={COLORS.teal} size="large" style={{ marginTop: 48 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No items match"
            subtitle="Try a different search or clear a filter."
          />
        ) : (
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
        )}
      </ScrollView>

      <FilterSheet
        visible={sheetOpen}
        categories={categories}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.ink,
    paddingVertical: 12,
  },
  filterByRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  filterByButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterByText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.teal,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  suggestedLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
    marginTop: 8,
    marginBottom: 10,
  },
  suggestedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  suggestedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
  },
  suggestedText: {
    fontSize: 12.5,
    color: COLORS.slate,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.scrim,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "80%",
    ...SHADOWS.sheet,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.line,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    marginBottom: 12,
  },
  sectionPillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  sectionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionPillActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  sectionPillText: {
    fontSize: 12.5,
    color: COLORS.slate,
  },
  sectionPillTextActive: {
    color: COLORS.white,
    fontWeight: "700",
  },
  sheetBody: {
    flexGrow: 0,
    marginBottom: 16,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.slate,
  },
  chipTextActive: {
    color: COLORS.tealDark,
    fontWeight: "600",
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  swatchWrap: {
    width: 64,
    alignItems: "center",
    gap: 5,
  },
  swatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  swatchRingActive: {
    borderColor: COLORS.teal,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  swatchBorder: {
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  multiSwatch: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  multiSquare: {
    width: 17,
    height: 17,
  },
  swatchLabel: {
    fontSize: 10.5,
    color: COLORS.muted,
  },
  swatchLabelActive: {
    color: COLORS.tealDark,
    fontWeight: "700",
  },
});

export default BuyerSearchScreen;
