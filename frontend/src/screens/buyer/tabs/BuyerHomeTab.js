import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { COLORS } from "../../../theme/colors";
import { SHADOWS } from "../../../theme/shadows";
import { buyerApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import StatusPill from "../../../components/vendor/StatusPill";
import EmptyState from "../../../components/vendor/EmptyState";
import BuyerProductCard from "../../../components/buyer/ProductCardGrid";

const CARD_WIDTH = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

const timeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Subtle green trust badge for CAC-verified stores (matches StatusPill small).
const CacChip = () => (
  <View style={styles.cacChip}>
    <Ionicons name="shield-checkmark" size={10} color={COLORS.green} />
    <Text style={styles.cacChipText}>CAC Verified</Text>
  </View>
);

// Horizontal card for a recommended store — taps through to the public store
// page.
const StoreCard = ({ store, onPress }) => (
  <TouchableOpacity style={styles.storeCard} onPress={onPress} activeOpacity={0.8}>
    {store.storeLogoUrl ? (
      <ProductThumb uri={store.storeLogoUrl} size={44} radius={22} />
    ) : (
      <View style={styles.storeAvatar}>
        <MaterialCommunityIcons name="storefront-outline" size={22} color={COLORS.red} />
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
  </TouchableOpacity>
);

// 2-column grid section ("Best selling products" / "Featured products").
const ProductSection = ({ title, items, navigation }) => {
  if (items.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
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
};

// One-time centred prompt asking the buyer to share their location so we can
// surface nearby vendors. Shown on first Home mount only (persisted flag).
const LocationModal = ({ visible, onAllow, onLater }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <View style={styles.modalIconWrap}>
          <Ionicons name="location" size={30} color={COLORS.red} />
        </View>
        <Text style={styles.modalTitle}>Turn on location to help us reach you.</Text>
        <Text style={styles.modalCopy}>
          We use your location to show vendors near you and give faster delivery
          estimates. We never share it with anyone.
        </Text>
        <TouchableOpacity style={styles.modalAllow} onPress={onAllow} activeOpacity={0.85}>
          <Text style={styles.modalAllowText}>Allow location access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalLater} onPress={onLater} activeOpacity={0.7}>
          <Text style={styles.modalLaterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const BuyerHomeTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const buyerPrefs = useUserStore((state) => state.buyerPrefs);
  const hydrateBuyerPrefs = useUserStore((state) => state.hydrateBuyerPrefs);
  const setLocationPromptSeen = useUserStore((state) => state.setLocationPromptSeen);
  const setBuyerLocation = useUserStore((state) => state.setBuyerLocation);

  const me = useFetch(() => buyerApi.me(token).catch(() => null), [token]);
  const vendors = useFetch(() => buyerApi.vendors(token), [token]);
  const bestSelling = useFetch(
    () => buyerApi.browse(token, { sort: "best_selling", limit: 6 }),
    [token],
  );
  const featured = useFetch(
    () => buyerApi.browse(token, { sort: "featured", limit: 6 }),
    [token],
  );

  const [showLocationModal, setShowLocationModal] = useState(false);

  // Ask for location once ever: hydrate the persisted flag first, then prompt
  // only if the buyer has never seen it.
  useEffect(() => {
    let alive = true;
    (async () => {
      await hydrateBuyerPrefs();
      if (alive && !useUserStore.getState().buyerPrefs.locationPromptSeen) {
        setShowLocationModal(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrateBuyerPrefs]);

  const allowLocation = async () => {
    setShowLocationModal(false);
    setLocationPromptSeen();
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setBuyerLocation(coords);
      await buyerApi.updateMe(token, coords);
      // Re-rank recommended stores now that distance is known.
      vendors.refresh();
    } catch (error) {
      // Location is a nice-to-have — never block the marketplace on it.
    }
  };

  const laterLocation = () => {
    setShowLocationModal(false);
    setLocationPromptSeen();
  };

  const firstName = me.data?.profile?.fullName?.split(" ")[0];
  const loading = vendors.loading || bestSelling.loading || featured.loading;
  const stores = vendors.data?.vendors || [];
  const bestItems = bestSelling.data?.products || [];
  const featuredItems = featured.data?.products || [];
  const nothingLive = bestItems.length === 0 && featuredItems.length === 0;

  return (
    <View style={styles.flex}>
      <LocationModal
        visible={showLocationModal}
        onAllow={allowLocation}
        onLater={laterLocation}
      />

      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() =>
            Alert.alert("Chat", "Chat is coming with the next milestone.")
          }
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() =>
            Alert.alert(
              "Notifications",
              "Notifications for buyers arrive with the next milestone.",
            )
          }
        >
          <Ionicons name="notifications-outline" size={18} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={bestSelling.refreshing}
            onRefresh={() => {
              vendors.refresh();
              bestSelling.refresh();
              featured.refresh();
            }}
          />
        }
      >
        <Text style={styles.greeting}>
          {firstName ? `${timeGreeting()}, ${firstName} 👋` : `${timeGreeting()} 👋`}
        </Text>
        <Text style={styles.subGreeting}>What are you shopping for today?</Text>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate("BuyerSearch")}
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={18} color={COLORS.muted} />
          <Text style={styles.searchPlaceholder}>Search styles, stores, colours...</Text>
          <Ionicons name="camera-outline" size={18} color={COLORS.muted} />
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
                      <StoreCard
                        key={store.vendorId}
                        store={store}
                        onPress={() =>
                          navigation.navigate("VendorStore", { vendorId: store.vendorId })
                        }
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : null}

            {nothingLive ? (
              <EmptyState
                icon="storefront-outline"
                title="Stalls are setting up"
                subtitle="No live listings right now. Check back soon — vendors are stocking their stores."
              />
            ) : (
              <>
                <ProductSection
                  title="Best selling products"
                  items={bestItems}
                  navigation={navigation}
                />
                <ProductSection
                  title="Featured products"
                  items={featuredItems}
                  navigation={navigation}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  greeting: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 6,
  },
  subGreeting: {
    fontSize: 12.5,
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
    flex: 1,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 6,
    marginBottom: 10,
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
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modalCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    ...SHADOWS.sheet,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
  },
  modalCopy: {
    fontSize: 12.5,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 18,
  },
  modalAllow: {
    alignSelf: "stretch",
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAllowText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.white,
  },
  modalLater: {
    alignSelf: "stretch",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  modalLaterText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.slate,
  },
});

export default BuyerHomeTab;
