import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../theme/colors";

// Pale teal used for the disabled / in-flight state of the primary pill CTA.
export const PALE_TEAL = "#A9DCD7";

/**
 * Bottom-anchored pill CTA.
 * - solid teal when enabled, pale teal when disabled
 * - while `busy`, shows `busyLabel` on a pale pill and blocks presses
 * - variant "outline" renders a white pill with a teal border (e.g. "Retake")
 */
const PillButton = ({ label, onPress, disabled, busy, busyLabel, variant = "solid", style }) => {
  const isOutline = variant === "outline";
  const inactive = disabled || busy;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isOutline
          ? styles.outline
          : { backgroundColor: inactive ? PALE_TEAL : COLORS.teal },
        style,
      ]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
    >
      <Text style={[styles.label, isOutline && styles.outlineLabel]} numberOfLines={1}>
        {busy ? busyLabel || label : label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  outline: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  outlineLabel: {
    color: COLORS.teal,
  },
});

export default PillButton;
