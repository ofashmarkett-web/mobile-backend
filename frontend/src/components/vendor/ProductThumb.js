import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

const ProductThumb = ({ uri, size = 52, radius = 10 }) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: COLORS.surface }}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Ionicons name="shirt-outline" size={size * 0.45} color={COLORS.faint} />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProductThumb;
