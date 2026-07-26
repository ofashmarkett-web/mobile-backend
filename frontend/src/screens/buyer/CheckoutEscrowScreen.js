import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { buyerApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import ProductThumb from "../../components/vendor/ProductThumb";
import PrimaryButton from "../../components/vendor/PrimaryButton";
import { naira } from "../../utils/format";

// One checkout line — shared by single-product and cart mode.
const CheckoutItemRow = ({ imageUrl, name, meta, price }) => (
  <View style={styles.itemRow}>
    <ProductThumb uri={imageUrl} size={54} />
    <View style={{ flex: 1 }}>
      <Text style={styles.itemName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.itemMeta}>{meta}</Text>
    </View>
    <Text style={styles.itemPrice}>{naira(price)}</Text>
  </View>
);

// Escrow checkout per the MVP spec: Confirm Price, then Make Payment, with the
// funds held in escrow until the buyer confirms delivery. Supports two modes:
// - single-product (params: product/store/size/quantity/unitPrice), and
// - cartMode, which reads the persisted cart and places one order per line.
const CheckoutEscrowScreen = ({ navigation, route }) => {
  const { product, store, size, quantity, unitPrice, cartMode } = route.params || {};
  const token = useUserStore((state) => state.token);
  const cartItems = useUserStore((state) => state.cart.items);
  const removeItem = useUserStore((state) => state.removeItem);
  const clearCart = useUserStore((state) => state.clearCart);
  const [address, setAddress] = useState("");
  const [priceConfirmed, setPriceConfirmed] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    buyerApi
      .me(token)
      .then((result) => {
        if (result?.profile?.defaultAddress) setAddress(result.profile.defaultAddress);
      })
      .catch(() => {});
  }, [token]);

  // Unified list of what is being bought, whichever mode we're in.
  const items = cartMode
    ? cartItems
    : [
        {
          productId: product.id,
          name: product.name,
          imageUrl: (product.images || [])[0] || null,
          unitPrice,
          size,
          quantity,
          vendorName: store?.businessName || "",
        },
      ];

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const itemMeta = (item) =>
    `${item.vendorName ? `${item.vendorName}   ` : ""}${
      item.size ? `Size: ${item.size}   ` : ""
    }Qty: ${item.quantity}`;

  const placeSingleOrder = async () => {
    setPlacing(true);
    try {
      const result = await buyerApi.placeOrder(token, {
        productId: product.id,
        size,
        quantity,
        deliveryAddress: address,
      });

      // Save the address for next time — real convenience, not required.
      buyerApi.updateMe(token, { defaultAddress: address }).catch(() => {});

      Alert.alert(
        "Payment secured 🔒",
        `Order #${result.order.orderNo} is placed. ${naira(result.order.orderAmount)} is held in escrow until you confirm delivery.`,
        [
          {
            text: "Track my order",
            onPress: () =>
              navigation.replace("ActiveOrderTracking", { orderId: result.order.id }),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Could not place order", error.message);
    } finally {
      setPlacing(false);
    }
  };

  // Cart checkout places one order per line, sequentially. Each success is
  // removed from the cart immediately, so a mid-run failure keeps only the
  // unplaced items in the cart.
  const placeCartOrders = async () => {
    setPlacing(true);
    const lines = [...cartItems];
    try {
      for (const line of lines) {
        try {
          await buyerApi.placeOrder(token, {
            productId: line.productId,
            size: line.size,
            quantity: line.quantity,
            deliveryAddress: address,
          });
        } catch (error) {
          Alert.alert(
            "Could not place order",
            `"${line.name}" failed: ${error.message}\n\nIt is still in your cart with any remaining items — anything already paid for was removed.`,
          );
          return;
        }
        removeItem(line.productId, line.size);
      }

      buyerApi.updateMe(token, { defaultAddress: address }).catch(() => {});
      clearCart();

      Alert.alert(
        "Payment secured 🔒",
        `${lines.length} order${lines.length === 1 ? " is" : "s are"} placed. ${naira(total)} is held in escrow until you confirm delivery.`,
        [
          {
            text: "View my orders",
            onPress: () =>
              navigation.navigate("BuyerDashboard", { initialTab: "orders" }),
          },
        ],
      );
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <Ionicons
          name="chevron-back"
          size={22}
          color={COLORS.ink}
          style={styles.back}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>CHECKOUT</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <CheckoutItemRow
            key={`${item.productId}-${item.size || "nosize"}`}
            imageUrl={item.imageUrl}
            name={item.name}
            meta={itemMeta(item)}
            price={item.unitPrice * item.quantity}
          />
        ))}

        <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>
        <TextInput
          style={styles.addressInput}
          placeholder="Where should we deliver this?"
          placeholderTextColor={COLORS.faint}
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <View style={styles.escrowBanner}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.teal} style={{ marginTop: 2 }} />
          <Text style={styles.escrowText}>
            Your money is safe and secure and will not be remitted to the seller until you have
            received and confirmed the purchased item.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          {cartMode ? (
            items.map((item) => (
              <View key={`sum-${item.productId}-${item.size || "nosize"}`} style={styles.summaryRow}>
                <Text style={styles.summaryLabel} numberOfLines={1}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={styles.summaryValue}>{naira(item.unitPrice * item.quantity)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Item total</Text>
              <Text style={styles.summaryValue}>{naira(total)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryNote}>Arranged after vendor accepts</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>You pay now</Text>
            <Text style={styles.summaryTotal}>{naira(total)}</Text>
          </View>
        </View>

        <Text style={styles.returnNote}>
          By paying, you agree to return the item in the same condition received if a return is
          initiated.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {!priceConfirmed ? (
          <PrimaryButton
            label={`Confirm Price — ${naira(total)}`}
            disabled={items.length === 0}
            onPress={() => setPriceConfirmed(true)}
          />
        ) : (
          <PrimaryButton
            label="Make Payment"
            loading={placing}
            disabled={!address.trim() || items.length === 0}
            onPress={cartMode ? placeCartOrders : placeSingleOrder}
          />
        )}
      </View>
    </SafeAreaView>
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
  back: { position: "absolute", left: 16 },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  itemName: { fontSize: 14.5, fontWeight: "700", color: COLORS.ink },
  itemMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  itemPrice: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginTop: 18,
    marginBottom: 8,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: COLORS.ink,
    minHeight: 64,
    textAlignVertical: "top",
  },
  escrowBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.tealSoft,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  escrowText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.slate,
    lineHeight: 18,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
  },
  summaryLabel: { flex: 1, fontSize: 13, color: COLORS.muted },
  summaryValue: { fontSize: 13, fontWeight: "600", color: COLORS.ink },
  summaryNote: { fontSize: 12, color: COLORS.muted, fontStyle: "italic" },
  summaryTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.line },
  summaryTotalLabel: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  summaryTotal: { fontSize: 16, fontWeight: "900", color: COLORS.teal },
  returnNote: {
    fontSize: 11.5,
    color: COLORS.muted,
    lineHeight: 16,
    marginTop: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
});

export default CheckoutEscrowScreen;
