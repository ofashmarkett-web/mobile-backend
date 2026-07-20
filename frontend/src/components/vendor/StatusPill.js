import React from "react";
import { StyleSheet, Text, View } from "react-native";

const StatusPill = ({ label, color, bg, small, dot }) => (
  <View style={[styles.pill, { backgroundColor: bg }, small && styles.small]}>
    {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    <Text style={[styles.text, { color }, small && styles.smallText]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
  smallText: {
    fontSize: 9,
  },
});

export default StatusPill;
