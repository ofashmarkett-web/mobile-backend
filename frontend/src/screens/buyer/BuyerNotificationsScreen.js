import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import BackCircle from "../../components/kyc/BackCircle";
import { notificationApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";

const ITEMS = [
  { title: "Order Confirmed", body: "Your order from Aduomo's Closet is confirmed.", icon: "checkmark-circle-outline", tone: COLORS.amber, bg: COLORS.amberSoft },
  { title: "Escrow Protected", body: "Your payment is safely held until you receive your order.", icon: "lock-closed-outline", tone: COLORS.red, bg: COLORS.orangeSoft },
  { title: "Complete your Purchase", body: "You left items in your cart. Complete checkout before they sell out.", icon: "gift-outline", tone: COLORS.amber, bg: COLORS.amberSoft },
];

const BuyerNotificationsScreen = ({ navigation }) => {
  const [expanded, setExpanded] = useState(null);
  const token = useUserStore((state) => state.token);
  const feed = useFetch(() => notificationApi.list(token), [token]);
  const items = feed.data?.items || [];
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <View style={styles.header}><BackCircle onPress={() => navigation.goBack()} style={styles.back} /><Text style={styles.headerTitle}>NOTIFICATIONS</Text><Ionicons name="checkmark-done-outline" size={16} color={COLORS.teal} /></View>
    <ScrollView contentContainerStyle={styles.content}>{feed.loading ? <Text style={styles.empty}>Loading notifications...</Text> : items.length === 0 ? <Text style={styles.empty}>No notifications yet.</Text> : items.map((item, index) => <Pressable key={item.id} style={styles.item} onPress={() => { setExpanded(expanded === index ? null : index); if (!item.readAt) notificationApi.markRead(token, item.id).catch(() => {}); }}><View style={[styles.icon, { backgroundColor: item.type === "order_delivered" ? COLORS.greenSoft : COLORS.amberSoft }]}><Ionicons name="notifications-outline" size={17} color={item.type === "order_delivered" ? COLORS.green : COLORS.amber} /></View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.body} numberOfLines={expanded === index ? undefined : 1}>{item.body}</Text>{expanded === index ? <Text style={styles.detail}>Open the related order to continue.</Text> : null}</View><Ionicons name={expanded === index ? "chevron-up" : "chevron-down"} size={13} color={COLORS.muted} /></Pressable>)}</ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.white }, header: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }, back: { position: "absolute", left: 16 }, headerTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "700", letterSpacing: 1.1 }, content: { paddingHorizontal: 17 }, empty: { color: COLORS.muted, textAlign: "center", marginTop: 60, fontSize: 10 }, item: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line }, icon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, title: { color: COLORS.ink, fontSize: 10, fontWeight: "700" }, body: { color: COLORS.muted, fontSize: 8, marginTop: 4 }, detail: { color: COLORS.slate, fontSize: 7, lineHeight: 11, marginTop: 5 } });

export default BuyerNotificationsScreen;
