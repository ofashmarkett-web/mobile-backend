import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { RiderHeader } from "./RiderUi";
import { notificationApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";

const ITEMS = [
  ["Order Confirmed", "A buyer confirmed an order in your area.", "checkmark-circle-outline", "#FFF3C9"],
  ["Escrow Protected", "Your payment is safely held until delivery is verified.", "lock-closed-outline", "#FFF0E6"],
  ["Complete your Purchase", "The battery on your vehicle is running low.", "gift-outline", "#FFF3C9"],
];
const RiderNotificationsScreen = ({ navigation }) => { const [open, setOpen] = useState(null); const token = useUserStore((state) => state.token); const feed = useFetch(() => notificationApi.list(token), [token]); const items = feed.data?.items || []; return <SafeAreaView style={styles.safe}><RiderHeader title="NOTIFICATIONS" back onBack={() => navigation.goBack()} right={<Ionicons name="checkmark-done-outline" size={15} color={COLORS.teal} />} /><ScrollView contentContainerStyle={styles.content}>{feed.loading ? <Text style={styles.empty}>Loading notifications...</Text> : items.length === 0 ? <Text style={styles.empty}>No notifications yet.</Text> : items.map((item, index) => <Pressable key={item.id} style={styles.item} onPress={() => { setOpen(open === index ? null : index); if (!item.readAt) notificationApi.markRead(token, item.id).catch(() => {}); }}><View style={[styles.icon, { backgroundColor: item.type === "nearby_delivery" ? COLORS.tealSoft : COLORS.amberSoft }]}><Ionicons name="notifications-outline" size={16} color={item.type === "nearby_delivery" ? COLORS.teal : COLORS.amber} /></View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.body} numberOfLines={open === index ? undefined : 1}>{item.body}</Text>{open === index ? <Text style={styles.detail}>Open deliveries to view the related assignment.</Text> : null}</View><Ionicons name={open === index ? "chevron-up" : "chevron-down"} size={13} color={COLORS.muted} /></Pressable>)}</ScrollView></SafeAreaView>; };
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.white }, content: { padding: 17 }, empty: { color: COLORS.muted, textAlign: "center", marginTop: 60, fontSize: 10 }, item: { minHeight: 63, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line }, icon: { width: 29, height: 29, borderRadius: 15, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, title: { color: COLORS.ink, fontSize: 9, fontWeight: "700" }, body: { color: COLORS.muted, fontSize: 7, marginTop: 4 }, detail: { color: COLORS.slate, fontSize: 7, lineHeight: 11, marginTop: 5 } });
export default RiderNotificationsScreen;
