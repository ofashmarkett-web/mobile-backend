import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import BottomSheet from "./BottomSheet";
import PrimaryButton from "./PrimaryButton";
import ProductThumb from "./ProductThumb";
import StatusPill from "./StatusPill";
import QuantityStepper from "./QuantityStepper";
import { COLORS } from "../../theme/colors";
import { productApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { STOCK_STATUS_META, stockLine } from "../../utils/format";

const QUICK_VALUES = [5, 10, 15, 20];

// Bottom sheet for updating a product's stock count (mockup: "Save stock count").
const StockSheet = ({ product, visible, onClose, onSaved }) => {
  const token = useUserStore((state) => state.token);
  const [quantity, setQuantity] = useState(product?.stockQuantity || 0);
  const [notify, setNotify] = useState(Boolean(product?.notifyOnRestock));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQuantity(product?.stockQuantity || 0);
    setNotify(Boolean(product?.notifyOnRestock));
  }, [product?.id, visible]);

  if (!product) return null;

  const meta = STOCK_STATUS_META[product.stockStatus] || STOCK_STATUS_META.in_stock;

  const save = async () => {
    setSaving(true);
    try {
      const result = await productApi.updateStock(token, product.id, {
        stockQuantity: quantity,
        notifyOnRestock: notify,
      });
      onSaved?.(result.product);
      onClose();
    } catch (error) {
      Alert.alert("Could not save stock", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.productRow}>
        <ProductThumb uri={(product.images || [])[0]} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={[styles.stockLine, { color: meta.color }]}>
            {meta.label} — {stockLine(product)}
          </Text>
        </View>
        {product.isTrending ? (
          <StatusPill label="TRENDING" color={COLORS.gold} bg={COLORS.goldSoft} small />
        ) : null}
      </View>

      <View style={styles.stepperWrap}>
        <QuantityStepper value={quantity} onChange={setQuantity} />
      </View>

      <View style={styles.quickRow}>
        {QUICK_VALUES.map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.quick, quantity === value && styles.quickActive]}
            onPress={() => setQuantity(value)}
          >
            <Text style={[styles.quickText, quantity === value && styles.quickTextActive]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.notifyRow}>
        <Text style={styles.notifyText}>
          Notify product availability to buyers who saved this item
        </Text>
        <Switch
          value={notify}
          onValueChange={setNotify}
          trackColor={{ false: COLORS.line, true: COLORS.teal }}
          thumbColor={COLORS.white}
        />
      </View>

      <PrimaryButton label="Save stock count" onPress={save} loading={saving} />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
  },
  stockLine: {
    fontSize: 12,
    marginTop: 2,
  },
  stepperWrap: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  quick: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  quickText: {
    fontSize: 14,
    color: COLORS.slate,
    fontWeight: "600",
  },
  quickTextActive: {
    color: COLORS.tealDark,
  },
  notifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.redSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  notifyText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.slate,
    lineHeight: 17,
  },
});

export default StockSheet;
