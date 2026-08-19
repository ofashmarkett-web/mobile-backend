import React from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { RiderTabs } from "./RiderUi";

const Row = ({ icon, title, subtitle, danger, onPress }) => <Pressable style={styles.row} onPress={onPress}>
  <View style={[styles.rowIcon, danger && styles.dangerIcon]}><Ionicons name={icon} size={14} color={danger ? COLORS.red : COLORS.ink} /></View>
  <View style={styles.rowCopy}><Text style={[styles.rowTitle, danger && { color: COLORS.red }]}>{title}</Text><Text style={styles.rowSub}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={14} color={COLORS.faint} />
</Pressable>;

const RiderProfileScreen = ({ navigation }) => <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
  <View style={styles.profile}><View style={styles.avatar}><Image source={require("../../assets/images/logo.png")} style={styles.avatarImage} /></View><Text style={styles.name}>Chidi Olanrewaju</Text><Text style={styles.email}>chidi.olanrewaju@ofash.com</Text></View>
  <View style={styles.list}><Row icon="person-outline" title="Personal Information" subtitle="Manage your profile details" onPress={() => navigation.navigate("RiderPersonalInfo")} /><Row icon="notifications-outline" title="Notifications" subtitle="Manage notification preferences" onPress={() => navigation.navigate("RiderNotifications")} /><Row icon="headset-outline" title="Contact Support" subtitle="Get help from our support team" onPress={() => Alert.alert("Support", "Our rider support team will get back to you shortly.")} /><Row icon="shield-checkmark-outline" title="Privacy Policy" subtitle="Read our privacy policy" onPress={() => Alert.alert("Privacy Policy", "Your rider data is used only to coordinate deliveries and protect your account.")} /><Row icon="document-text-outline" title="Terms & Conditions" subtitle="Read our terms and conditions" onPress={() => Alert.alert("Terms & Conditions", "By accepting deliveries, you agree to our rider terms.")} /></View>
  <View style={styles.list}><Row icon="log-out-outline" title="Log out" subtitle="Sign out of this device" onPress={() => Alert.alert("Log out", "Are you sure you want to log out?")} /><Row icon="trash-outline" title="Delete account" subtitle="Permanently delete your account" danger onPress={() => Alert.alert("Delete account", "This action cannot be undone.")} /></View>
</ScrollView><RiderTabs active="Profile" navigation={navigation} /></SafeAreaView>;

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.white }, content: { padding: 17, paddingBottom: 24 }, profile: { alignItems: "center", paddingVertical: 18 }, avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.tealSoft, overflow: "hidden", alignItems: "center", justifyContent: "center" }, avatarImage: { width: 65, height: 47 }, name: { color: COLORS.ink, fontSize: 11, fontWeight: "800", marginTop: 9 }, email: { color: COLORS.muted, fontSize: 7, marginTop: 3 }, list: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.line, marginBottom: 14 }, row: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: COLORS.line }, rowIcon: { width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" }, dangerIcon: { backgroundColor: COLORS.redSoft }, rowCopy: { flex: 1 }, rowTitle: { color: COLORS.ink, fontSize: 9, fontWeight: "700" }, rowSub: { color: COLORS.muted, fontSize: 7, marginTop: 3 } });

export default RiderProfileScreen;
