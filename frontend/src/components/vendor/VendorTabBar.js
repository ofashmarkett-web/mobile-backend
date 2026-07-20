import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

export const VENDOR_TABS = [
  { key: "home", label: "Home", icon: "apps-outline", activeIcon: "apps" },
  { key: "listings", label: "Listings", icon: "pricetags-outline", activeIcon: "pricetags" },
  { key: "orders", label: "Orders", icon: "basket-outline", activeIcon: "basket" },
  { key: "analytics", label: "Analytics", icon: "stats-chart-outline", activeIcon: "stats-chart" },
  { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

export const BUYER_TABS = [
  { key: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "search", label: "Search", icon: "search-outline", activeIcon: "search" },
  { key: "orders", label: "Orders", icon: "basket-outline", activeIcon: "basket" },
  { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

const VendorTabBar = ({ active, onChange, tabs = VENDOR_TABS }) => (
  <View style={styles.bar}>
    {tabs.map((tab) => {
      const isActive = tab.key === active;

      return (
        <TouchableOpacity
          key={tab.key}
          style={styles.item}
          onPress={() => onChange(tab.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
        >
          <Ionicons
            name={isActive ? tab.activeIcon : tab.icon}
            size={22}
            color={isActive ? COLORS.teal : COLORS.muted}
          />
          <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
    paddingBottom: 4,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  label: {
    fontSize: 11,
    color: COLORS.muted,
  },
  labelActive: {
    color: COLORS.teal,
    fontWeight: "600",
  },
});

export default VendorTabBar;
