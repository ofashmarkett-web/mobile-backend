import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

// Teal circular back button used at the top-left of every onboarding/KYC step.
const BackCircle = ({ onPress, style }) => (
  <TouchableOpacity
    style={[styles.circle, style]}
    onPress={onPress}
    activeOpacity={0.8}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="chevron-back" size={20} color={COLORS.white} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BackCircle;
