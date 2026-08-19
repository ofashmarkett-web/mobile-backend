import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

export const RIDES = [
  { id: "1", customer: "Aduomo's Closet", address: "22 Bodeth Thomas, Surulere", amount: "₦20,000", distance: "2km", status: "Pending", tone: "amber" },
  { id: "2", customer: "Aduomo's Closet", address: "32 Bode Thomas, Surulere", amount: "₦20,000", distance: "2km", status: "Active", tone: "red" },
  { id: "3", customer: "Aduomo's Closet", address: "22 Bodeth Thomas, Surulere", amount: "₦20,000", distance: "2km", status: "Completed", tone: "green" },
];

const STATUS = { amber: ["#FFF6E3", "#F5A623"], red: ["#FDECEC", "#E5484D"], green: ["#E9F7EF", "#2FA96C"] };

export const RiderHeader = ({ title = "DASHBOARD", back, onBack, right }) => (
  <View style={styles.header}>
    <Pressable hitSlop={12} onPress={onBack} style={styles.headerSide}>
      {back ? <Ionicons name="chevron-back" size={19} color={COLORS.ink} /> : null}
    </Pressable>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={[styles.headerSide, styles.headerRight]}>{right || <Ionicons name="notifications-outline" size={15} color={COLORS.ink} />}</View>
  </View>
);

export const DeliveryCard = ({ ride, onPress }) => {
  const [soft, color] = STATUS[ride.tone] || STATUS.amber;
  return <Pressable onPress={onPress} style={styles.card}>
    <View style={[styles.cardDot, { backgroundColor: color }]} />
    <View style={styles.cardMain}>
      <Text style={styles.cardCustomer}>{ride.customer}</Text>
      <Text style={styles.cardAddress} numberOfLines={1}>{ride.address}</Text>
      <View style={styles.cardBottom}><Ionicons name="location" size={12} color={COLORS.ink} /><Text style={styles.distance}>{ride.distance}</Text><Text style={styles.vehicle}>25k Afobility Way, Lekki Phase 1</Text></View>
    </View>
    <View style={styles.cardAmount}><Text style={styles.amount}>{ride.amount}</Text><View style={[styles.status, { backgroundColor: soft }]}><View style={[styles.statusDot, { backgroundColor: color }]} /><Text style={[styles.statusText, { color }]}>{ride.status}</Text></View></View>
  </Pressable>;
};

export const RiderTabs = ({ active, navigation }) => <View style={styles.tabs}>
  {[ ["Home", "grid-outline", "RiderDashboard"], ["Deliveries", "bicycle-outline", "AvailableRides"], ["Profile", "person-outline", "RiderProfile"] ].map(([label, icon, route]) => {
    const selected = label === active;
    return <Pressable key={label} onPress={() => navigation.navigate(route)} style={styles.tab} hitSlop={8}><Ionicons name={icon} size={17} color={selected ? COLORS.teal : COLORS.muted} /><Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text></Pressable>;
  })}
</View>;

export const styles = StyleSheet.create({
  header: { height: 47, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerSide: { width: 30, height: 30, alignItems: "flex-start", justifyContent: "center" }, headerRight: { alignItems: "flex-end" }, headerTitle: { fontSize: 8, fontWeight: "800", color: COLORS.ink },
  card: { minHeight: 76, borderRadius: 7, backgroundColor: COLORS.white, padding: 11, flexDirection: "row", marginBottom: 9, elevation: 2, shadowColor: "#68747b", shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  cardDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4, marginRight: 8 }, cardMain: { flex: 1, minWidth: 0 }, cardCustomer: { color: COLORS.ink, fontWeight: "700", fontSize: 9 }, cardAddress: { color: COLORS.slate, fontSize: 7, marginTop: 3 }, cardBottom: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 9 }, distance: { color: COLORS.ink, fontWeight: "700", fontSize: 8 }, vehicle: { color: COLORS.muted, fontSize: 6, marginLeft: 4 },
  cardAmount: { alignItems: "flex-end", marginLeft: 5 }, amount: { color: COLORS.ink, fontWeight: "800", fontSize: 8 }, status: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3, marginTop: 5 }, statusDot: { width: 4, height: 4, borderRadius: 2 }, statusText: { fontSize: 6, fontWeight: "700" },
  tabs: { height: 58, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.line, flexDirection: "row", justifyContent: "space-around", paddingTop: 7 }, tab: { minWidth: 62, alignItems: "center", gap: 3 }, tabText: { fontSize: 7, color: COLORS.muted }, tabTextActive: { color: COLORS.teal, fontWeight: "700" },
});
