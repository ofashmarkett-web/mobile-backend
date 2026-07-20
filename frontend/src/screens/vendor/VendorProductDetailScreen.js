import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { productApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import Stars from "../../components/vendor/Stars";
import StatusPill from "../../components/vendor/StatusPill";
import ProductThumb from "../../components/vendor/ProductThumb";
import StockSheet from "../../components/vendor/StockSheet";
import { naira, priceLabel, STOCK_STATUS_META, stockLine } from "../../utils/format";

const { width } = Dimensions.get("window");

const MEASUREMENT_LABELS = { bust: "Bust", waist: "Waist", handLength: "Hand length" };

const VendorProductDetailScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const token = useUserStore((state) => state.token);
  const detail = useFetch(() => productApi.get(token, productId), [token, productId]);
  const [page, setPage] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [showStock, setShowStock] = useState(false);

  if (detail.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.teal} size="large" />
      </View>
    );
  }

  if (detail.error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{detail.error.message}</Text>
      </SafeAreaView>
    );
  }

  const { product, reviews = [], reviewCount = 0, store } = detail.data || {};
  const images = product?.images || [];
  const stockMeta = STOCK_STATUS_META[product?.stockStatus] || STOCK_STATUS_META.in_stock;

  const toggleActive = async (value) => {
    setToggling(true);
    try {
      await productApi.setActive(token, product.id, value);
      await detail.refresh();
    } catch (error) {
      Alert.alert("Could not update listing", error.message);
    } finally {
      setToggling(false);
    }
  };

  const shareProduct = () =>
    Share.share({
      message: `${product.name} — ${priceLabel(product)} at ${store?.businessName || "my store"} on O-Fash Markett`,
    }).catch(() => {});

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) =>
                setPage(Math.round(event.nativeEvent.contentOffset.x / width))
              }
            >
              {images.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.hero} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="hanger" size={64} color={COLORS.faint} />
            </View>
          )}

          <TouchableOpacity style={[styles.heroButton, { left: 14 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroButton, { right: 14 }]} onPress={shareProduct}>
            <Ionicons name="share-social-outline" size={18} color={COLORS.ink} />
          </TouchableOpacity>

          {images.length > 0 ? (
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>
                {page + 1}/{images.length}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.statusBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Product listing status</Text>
              <Text style={styles.statusSub}>This is visible to buyers when store is live</Text>
            </View>
            <Switch
              value={Boolean(product.isActive)}
              onValueChange={toggleActive}
              disabled={toggling}
              trackColor={{ false: COLORS.line, true: COLORS.teal }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name}</Text>
            {product.isBestSeller ? (
              <StatusPill label="🔥 TOP" color={COLORS.gold} bg={COLORS.goldSoft} small />
            ) : null}
          </View>
          <Text style={styles.price}>{priceLabel(product)}</Text>

          <TouchableOpacity onPress={() => setShowStock(true)}>
            <Text style={[styles.stockLine, { color: stockMeta.color }]}>
              ● {stockMeta.label} — {stockLine(product)}
            </Text>
          </TouchableOpacity>

          {(product.sizes || []).length > 0 ? (
            <View style={styles.sizesRow}>
              <Text style={styles.sizesLabel}>Size</Text>
              {product.sizes.map((size) => (
                <View key={size} style={styles.sizeChip}>
                  <Text style={styles.sizeChipText}>{size}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {Object.keys(product.measurements || {}).filter((key) => product.measurements[key])
            .length > 0 ? (
            <View style={styles.measureRow}>
              {Object.entries(product.measurements)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <Text key={key} style={styles.measureText}>
                    {MEASUREMENT_LABELS[key] || key}: {value}
                  </Text>
                ))}
            </View>
          ) : null}

          {store ? (
            <View style={styles.storeCard}>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{store.businessName}</Text>
                <Text style={styles.storeMeta}>
                  @{store.storeHandle}
                  {(store.categories || [])[0] ? ` • ${store.categories[0]}` : ""}
                </Text>
              </View>
              <View style={styles.storeRight}>
                <View style={styles.storeRatingRow}>
                  <Text style={styles.storeRating}>{store.rating || "—"}</Text>
                  <Ionicons name="star" size={13} color={COLORS.star} />
                </View>
                <Text style={styles.storeSold}>
                  {store.totalSold > 0 ? `${store.totalSold.toLocaleString()} sold` : "No sales yet"}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.reviewsHeader}>
            <Text style={styles.reviewsTitle}>Customer reviews</Text>
            <Text style={styles.reviewsCount}>
              {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </Text>
          </View>

          {reviews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.reviewsRow}>
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewInitial}>{review.buyerName[0]}</Text>
                      </View>
                      <View>
                        <Text style={styles.reviewName}>{review.buyerName}</Text>
                        <Stars rating={review.rating} size={11} />
                      </View>
                    </View>
                    {review.comment ? (
                      <Text style={styles.reviewComment} numberOfLines={4}>
                        “{review.comment}”
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.noReviews}>
              No reviews yet. Reviews appear here after buyers rate this item.
            </Text>
          )}
        </View>
      </ScrollView>

      <StockSheet
        product={product}
        visible={showStock}
        onClose={() => setShowStock(false)}
        onSaved={() => detail.refresh()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  errorText: { color: COLORS.slate, padding: 24, textAlign: "center" },
  hero: {
    width,
    height: width * 0.9,
    backgroundColor: COLORS.surface,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroButton: {
    position: "absolute",
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  pageBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    backgroundColor: COLORS.scrim,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pageBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    padding: 16,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.tealSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  statusSub: {
    fontSize: 11.5,
    color: COLORS.slate,
    marginTop: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    flexShrink: 1,
  },
  price: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.ink,
    marginTop: 4,
  },
  stockLine: {
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 6,
  },
  sizesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  sizesLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginRight: 4,
  },
  sizeChip: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sizeChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.ink,
  },
  measureRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
    flexWrap: "wrap",
  },
  measureText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    marginTop: 18,
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
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  storeMeta: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  storeRight: {
    alignItems: "flex-end",
  },
  storeRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  storeRating: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
  },
  storeSold: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  reviewsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
  },
  reviewsCount: {
    fontSize: 12,
    color: COLORS.muted,
  },
  reviewsRow: {
    flexDirection: "row",
    gap: 10,
  },
  reviewCard: {
    width: 220,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInitial: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.tealDark,
  },
  reviewName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  reviewComment: {
    fontSize: 12,
    color: COLORS.slate,
    lineHeight: 17,
  },
  noReviews: {
    fontSize: 12.5,
    color: COLORS.muted,
    lineHeight: 18,
  },
});

export default VendorProductDetailScreen;
