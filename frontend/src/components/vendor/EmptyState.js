import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

const EmptyState = ({ icon = "shirt-outline", title, subtitle }) => (
  <View style={styles.wrap}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={64} color={COLORS.line} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.ink,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});

export default EmptyState;
