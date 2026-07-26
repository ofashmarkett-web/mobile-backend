import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import ProductThumb from "../vendor/ProductThumb";
import { useUserStore } from "../../store/userStore";
import { naira } from "../../utils/format";

// Grid product card shared by the buyer Home and Categories tabs and the search
// results. Prices are honest: the strikethrough "compare" price only appears
// when the vendor set a real min-max range (priceMax bold, priceMin struck) —
// no fabricated discounts.
const BuyerProductCard = ({ item, width, onPress }) => {
  const addToCart = useUserStore((state) => state.addToCart);

  const onCartPress = () => {
    // Sized products need a size choice — send the buyer to the detail screen
    // (the card's own onPress) instead of guessing.
    if ((item.sizes || []).length > 0) {
      onPress();
      return;
    }
    addToCart({
      productId: item.id,
      name: item.name,
      imageUrl: (item.images || [])[0] || null,
      unitPrice: item.usePriceRange ? item.priceMax : item.basePrice,
      size: null,
      quantity: 1,
      stockQuantity: item.stockQuantity,
      vendorName: item.store?.businessName || "",
    });
    Alert.alert("Added to cart", `${item.name} is now in your cart.`);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ProductThumb
        uri={(item.images || [])[0]}
        size={width - 20}
        radius={12}
      />
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.metaRow}>
        {item.store?.ratingCount > 0 ? (
          <>
            <Ionicons name="star" size={11} color={COLORS.star} />
            <Text style={styles.metaText}>{item.store.rating}</Text>
          </>
        ) : null}
        {item.unitsSold > 0 ? (
          <Text style={styles.metaText}>{item.unitsSold}+ sold</Text>
        ) : null}
        {!(item.store?.ratingCount > 0) && !(item.unitsSold > 0) ? (
          <Text style={styles.metaText}>New in</Text>
        ) : null}
      </View>
      <View style={styles.priceRow}>
        <View style={styles.priceWrap}>
          {item.usePriceRange &&
          item.priceMin != null &&
          item.priceMax != null ? (
            <>
              <Text style={styles.price} numberOfLines={1}>
                {naira(item.priceMax)}
              </Text>
              <Text style={styles.comparePrice} numberOfLines={1}>
                {naira(item.priceMin)}
              </Text>
            </>
          ) : (
            <Text style={styles.price} numberOfLines={1}>
              {naira(item.basePrice)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.cartButton}
          hitSlop={8}
          onPress={onCartPress}
        >
          <Ionicons name="cart-outline" size={15} color={COLORS.teal} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 10,
    ...SHADOWS.card,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.ink,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 10.5,
    color: COLORS.muted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  priceWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.ink,
  },
  comparePrice: {
    fontSize: 10.5,
    color: COLORS.muted,
    textDecorationLine: "line-through",
  },
  cartButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BuyerProductCard;
