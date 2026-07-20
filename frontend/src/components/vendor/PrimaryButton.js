import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../theme/colors";

const PrimaryButton = ({ label, onPress, disabled, loading, variant = "solid", style }) => {
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline && styles.outline,
        variant === "danger-outline" && styles.dangerOutline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.teal : COLORS.white} />
      ) : (
        <Text
          style={[
            styles.label,
            isOutline && styles.outlineLabel,
            variant === "danger-outline" && styles.dangerLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  outline: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
  },
  dangerOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.line,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  outlineLabel: {
    color: COLORS.teal,
  },
  dangerLabel: {
    color: COLORS.slate,
  },
});

export default PrimaryButton;
