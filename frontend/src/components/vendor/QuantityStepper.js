import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

const QuantityStepper = ({ value, onChange, min = 0, unitLabel = "units" }) => (
  <View style={styles.row}>
    <TouchableOpacity
      style={styles.control}
      onPress={() => onChange(Math.max(min, value - 1))}
      accessibilityLabel="Decrease quantity"
    >
      <Ionicons name="remove" size={22} color={COLORS.ink} />
    </TouchableOpacity>

    <View style={styles.valueWrap}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unitLabel}</Text>
    </View>

    <TouchableOpacity
      style={styles.control}
      onPress={() => onChange(value + 1)}
      accessibilityLabel="Increase quantity"
    >
      <Ionicons name="add" size={22} color={COLORS.ink} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  control: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  valueWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  value: {
    fontSize: 44,
    fontWeight: "800",
    color: COLORS.ink,
    lineHeight: 48,
  },
  unit: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
});

export default QuantityStepper;
