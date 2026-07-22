import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { buyerApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import Stars from "../../components/vendor/Stars";
import ProductThumb from "../../components/vendor/ProductThumb";
import PrimaryButton from "../../components/vendor/PrimaryButton";
import { naira, priceLabel } from "../../utils/format";

const { width } = Dimensions.get("window");

// Subtle green trust badge for CAC-verified stores.
const CacChip = () => (
  <View style={styles.cacChip}>
    <Ionicons name="shield-checkmark" size={10} color={COLORS.green} />
    <Text style={styles.cacChipText}>CAC Verified</Text>
  </View>
);

const ProductDetailScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const token = useUserStore((state) => state.token);
  const detail = useFetch(() => buyerApi.product(token, productId), [token, productId]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Real view tracking — this powers the vendor's insight banner and analytics.
  useEffect(() => {
    buyerApi.recordView(productId);
  }, [productId]);

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

  const { product, store, reviews = [] } = detail.data || {};
  const images = product?.images || [];
  const unitPrice = product.usePriceRange ? product.priceMax : product.basePrice;
  const canBuy = product.stockQuantity > 0 && ((product.sizes || []).length === 0 || size);

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          {images.length > 1 ? (
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>
                {page + 1}/{images.length}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.conditionChip}>
            <Text style={styles.conditionText}>
              {product.condition === "thrift" ? "Thrift" : "New with tags"}
            </Text>
          </View>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.price}>{priceLabel(product)}</Text>
          {product.usePriceRange ? (
            <Text style={styles.negotiable}>Open to negotiation within this range</Text>
          ) : null}

          {(product.sizes || []).length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>PICK YOUR SIZE</Text>
              <View style={styles.sizeRow}>
                {product.sizes.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.sizeChip, size === option && styles.sizeChipActive]}
                    onPress={() => setSize(option)}
                  >
                    <Text style={[styles.sizeText, size === option && styles.sizeTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>QUANTITY</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={18} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
            >
              <Ionicons name="add" size={18} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={styles.stockNote}>
              {product.stockQuantity} unit{product.stockQuantity === 1 ? "" : "s"} available
            </Text>
          </View>

          {store ? (
            <View style={styles.storeCard}>
              {store.storeLogoUrl ? (
                <ProductThumb uri={store.storeLogoUrl} size={42} radius={21} />
              ) : (
                <View style={styles.storeAvatar}>
                  <MaterialCommunityIcons name="storefront-outline" size={20} color={COLORS.red} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{store.businessName}</Text>
                <Text style={styles.storeMeta}>@{store.storeHandle}</Text>
                {store.cacVerified ? <CacChip /> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Stars rating={store.rating} size={12} />
                <Text style={styles.storeMeta}>
                  {store.ratingCount > 0
                    ? `${store.rating} (${store.ratingCount})`
                    : "New store"}
                </Text>
              </View>
            </View>
          ) : null}

          {reviews.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>WHAT BUYERS SAY</Text>
              {reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewRow}>
                  <Stars rating={review.rating} size={11} />
                  {review.comment ? (
                    <Text style={styles.reviewText}>“{review.comment}”</Text>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerPrice}>{naira(unitPrice * quantity)}</Text>
        </View>
        <PrimaryButton
          label="Buy now"
          style={{ flex: 1, marginLeft: 16 }}
          disabled={!canBuy}
          onPress={() =>
            navigation.navigate("CheckoutEscrow", {
              product,
              store,
              size,
              quantity,
              unitPrice,
            })
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  errorText: { color: COLORS.slate, padding: 24, textAlign: "center" },
  hero: { width, height: width * 0.9, backgroundColor: COLORS.surface },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  backButton: {
    position: "absolute",
    top: 12,
    left: 14,
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
  pageBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: "700" },
  body: { padding: 16 },
  conditionChip: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.goldSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  conditionText: { fontSize: 11, fontWeight: "700", color: COLORS.gold },
  title: { fontSize: 19, fontWeight: "800", color: COLORS.ink },
  price: { fontSize: 22, fontWeight: "900", color: COLORS.teal, marginTop: 4 },
  negotiable: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginTop: 18,
    marginBottom: 8,
  },
  sizeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  sizeChip: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sizeChipActive: { borderColor: COLORS.teal, backgroundColor: COLORS.tealSoft },
  sizeText: { fontSize: 13, fontWeight: "600", color: COLORS.slate },
  sizeTextActive: { color: COLORS.tealDark },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: { fontSize: 18, fontWeight: "800", color: COLORS.ink, minWidth: 24, textAlign: "center" },
  stockNote: { fontSize: 12, color: COLORS.muted },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    marginTop: 20,
  },
  storeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  storeMeta: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  cacChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
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
  reviewRow: { marginBottom: 10, gap: 4 },
  reviewText: { fontSize: 12.5, color: COLORS.slate, lineHeight: 18 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  footerLabel: { fontSize: 11, color: COLORS.muted },
  footerPrice: { fontSize: 18, fontWeight: "900", color: COLORS.ink },
});

export default ProductDetailScreen;
