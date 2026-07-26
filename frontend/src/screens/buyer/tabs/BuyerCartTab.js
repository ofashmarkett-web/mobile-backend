import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { useUserStore } from "../../../store/userStore";
import EmptyState from "../../../components/vendor/EmptyState";
import ProductThumb from "../../../components/vendor/ProductThumb";
import PrimaryButton from "../../../components/vendor/PrimaryButton";
import { naira } from "../../../utils/format";

// One cart line. Module scope only — defining it inside the tab would remount
// the row (and drop touch state) on every render.
const CartRow = ({ item, onIncrement, onDecrement, onRemove }) => (
  <View style={styles.row}>
    <ProductThumb uri={item.imageUrl} size={56} radius={12} />
    <View style={styles.rowBody}>
      <Text style={styles.rowName} numberOfLines={1}>
        {item.name}
      </Text>
      {item.size ? <Text style={styles.rowMeta}>Size: {item.size}</Text> : null}
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepButton, item.quantity <= 1 && styles.stepButtonDisabled]}
          onPress={onDecrement}
          disabled={item.quantity <= 1}
          hitSlop={6}
        >
          <Ionicons name="remove" size={15} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{item.quantity}</Text>
        <TouchableOpacity
          style={[
            styles.stepButton,
            item.quantity >= (item.stockQuantity || 1) && styles.stepButtonDisabled,
          ]}
          onPress={onIncrement}
          disabled={item.quantity >= (item.stockQuantity || 1)}
          hitSlop={6}
        >
          <Ionicons name="add" size={15} color={COLORS.ink} />
        </TouchableOpacity>
      </View>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowPrice}>{naira(item.unitPrice)}</Text>
      <TouchableOpacity style={styles.trashButton} onPress={onRemove} hitSlop={6}>
        <Ionicons name="trash-outline" size={16} color={COLORS.red} />
      </TouchableOpacity>
    </View>
  </View>
);

const BuyerCartTab = ({ navigation, switchTab }) => {
  const items = useUserStore((state) => state.cart.items);
  const updateQuantity = useUserStore((state) => state.updateQuantity);
  const removeItem = useUserStore((state) => state.removeItem);

  const itemsTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const unitCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const confirmRemove = (item) =>
    Alert.alert("Remove item", `Remove ${item.name} from your cart?`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeItem(item.productId, item.size),
      },
    ]);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CART</Text>
      </View>

      {items.length === 0 ? (
        <View>
          <EmptyState
            icon="cart-outline"
            title="Your cart is empty"
            subtitle="Browse the market and add items you love."
          />
          <TouchableOpacity style={styles.ghostButton} onPress={() => switchTab("home")}>
            <Text style={styles.ghostButtonText}>Start shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {items.map((item, index) => (
              <View key={`${item.productId}-${item.size || "nosize"}`}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <CartRow
                  item={item}
                  onIncrement={() =>
                    updateQuantity(item.productId, item.size, item.quantity + 1)
                  }
                  onDecrement={() =>
                    updateQuantity(item.productId, item.size, item.quantity - 1)
                  }
                  onRemove={() => confirmRemove(item)}
                />
              </View>
            ))}

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items total</Text>
                <Text style={styles.summaryValue}>{naira(itemsTotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryNote}>Arranged after vendor accepts</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotal}>{naira(itemsTotal)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              label={`Checkout (${unitCount} item${unitCount === 1 ? "" : "s"})`}
              onPress={() => navigation.navigate("CheckoutEscrow", { cartMode: true })}
            />
          </View>
        </>
      )}
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
  ghostButton: {
    alignSelf: "center",
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
  ghostButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.teal,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  divider: { height: 1, backgroundColor: COLORS.line },
  rowBody: { flex: 1 },
  rowName: { fontSize: 13.5, fontWeight: "600", color: COLORS.ink },
  rowMeta: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonDisabled: { opacity: 0.4 },
  stepValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
    minWidth: 18,
    textAlign: "center",
  },
  rowRight: { alignItems: "flex-end", gap: 10 },
  rowPrice: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  trashButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: 11,
  },
  summaryLabel: { fontSize: 13, color: COLORS.muted },
  summaryValue: { fontSize: 13, fontWeight: "600", color: COLORS.ink },
  summaryNote: { fontSize: 12, color: COLORS.muted, fontStyle: "italic" },
  summaryTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.line },
  summaryTotalLabel: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  summaryTotal: { fontSize: 16, fontWeight: "900", color: COLORS.teal },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
});

export default BuyerCartTab;
