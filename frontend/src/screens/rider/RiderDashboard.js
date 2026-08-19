import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import { DeliveryCard, RIDES, RiderHeader, RiderTabs } from "./RiderUi";

const RiderDashboard = ({ navigation }) => {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(enter, { toValue: 1, duration: 450, useNativeDriver: true }).start(); }, [enter]);
  return <SafeAreaView style={styles.safe}><RiderHeader /><Animated.ScrollView style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }} contentContainerStyle={styles.content}>
    <View style={styles.profile}><Image source={require("../../assets/images/logo.png")} style={styles.avatar} /><View style={styles.profileCopy}><Text style={styles.name}>Chidi Olaniyemwaju</Text><Text style={styles.rating}>★ ★ ★ ★ ☆  4.8</Text><Text style={styles.level}>Professional • 5 years</Text></View></View>
    <View style={styles.metrics}><View style={styles.metric}><Text style={styles.metricLabel}>PENDING DELIVERY</Text><Text style={styles.metricNumber}>2</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>TOTAL DELIVERIES MADE</Text><Text style={styles.metricNumber}>100</Text></View></View>
    <Text style={styles.section}>PENDING REQUEST</Text>{RIDES.slice(0, 2).map((ride) => <DeliveryCard key={ride.id} ride={ride} onPress={() => navigation.navigate("MapNavigation", { ride })} />)}
  </Animated.ScrollView><RiderTabs active="Home" navigation={navigation} /></SafeAreaView>;
};

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F8FAFA" }, content: { paddingHorizontal: 17, paddingBottom: 16 }, profile: { flexDirection: "row", paddingTop: 6, paddingBottom: 18 }, avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: COLORS.tealSoft }, profileCopy: { marginLeft: 9, flex: 1 }, name: { fontSize: 10, fontWeight: "800", color: COLORS.ink }, rating: { position: "absolute", right: 0, top: 1, color: "#F7B500", fontSize: 8 }, level: { color: COLORS.muted, fontSize: 7, marginTop: 4 }, metrics: { flexDirection: "row", gap: 8, marginBottom: 21 }, metric: { flex: 1, backgroundColor: COLORS.white, padding: 11, borderRadius: 5 }, metricLabel: { color: COLORS.muted, fontSize: 6, fontWeight: "700" }, metricNumber: { color: COLORS.ink, fontSize: 15, fontWeight: "800", marginTop: 8 }, section: { color: COLORS.muted, fontSize: 7, fontWeight: "700", marginBottom: 8 } });

export default RiderDashboard;
