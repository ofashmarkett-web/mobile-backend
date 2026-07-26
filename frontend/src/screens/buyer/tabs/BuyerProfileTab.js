import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { SHADOWS } from "../../../theme/shadows";
import { authApi, buyerApi, resolveRoleLanding } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import { initials } from "../../../utils/format";

// Menu row per the mockup: icon in a soft circle, title + subtitle, and either
// a chevron or a custom control (Switch) on the right. Module scope only —
// defining it inside the tab would remount it every render.
const MenuRow = ({ icon, iconColor, iconBg, title, titleColor, subtitle, onPress, right, divider }) => (
  <TouchableOpacity
    style={[styles.row, divider && styles.rowDivider]}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={!onPress}
  >
    <View style={[styles.rowIcon, iconBg ? { backgroundColor: iconBg } : null]}>
      <Ionicons name={icon} size={18} color={iconColor || COLORS.teal} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
      <Text style={styles.rowSubtitle}>{subtitle}</Text>
    </View>
    {right || <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />}
  </TouchableOpacity>
);

const BuyerProfileTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const setSession = useUserStore((state) => state.setSession);
  const resetUser = useUserStore((state) => state.resetUser);
  const notificationsEnabled = useUserStore(
    (state) => state.buyerPrefs.notificationsEnabled ?? true,
  );
  const setNotificationsEnabled = useUserStore((state) => state.setNotificationsEnabled);
  const me = useFetch(() => buyerApi.me(token), [token]);
  const [switching, setSwitching] = useState(false);
  const [vendorSwitchOn, setVendorSwitchOn] = useState(false);

  const becomeVendor = async () => {
    setSwitching(true);
    try {
      // The role lives in the JWT, so switching returns a fresh session.
      const session = await authApi.switchRole(token, "vendor");
      setSession({ token: session.token, user: session.user });

      // Vendors who finished onboarding go straight to their dashboard —
      // not back through KYC.
      const screen = await resolveRoleLanding(session.token, "vendor");
      navigation.getParent()?.navigate("Vendor", { screen });
    } catch (error) {
      setVendorSwitchOn(false);
      Alert.alert("Could not switch", error.message);
    } finally {
      setSwitching(false);
    }
  };

  const onVendorToggle = (value) => {
    if (!value) {
      setVendorSwitchOn(false);
      return;
    }
    setVendorSwitchOn(true);
    Alert.alert(
      "Become a Vendor",
      "You'll set up your store and switch to the vendor workspace.",
      [
        { text: "Cancel", style: "cancel", onPress: () => setVendorSwitchOn(false) },
        { text: "Continue", onPress: becomeVendor },
      ],
      { cancelable: true, onDismiss: () => setVendorSwitchOn(false) },
    );
  };

  const logout = () =>
    Alert.alert("Log out", "Want to take a break?", [
      { text: "Stay", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          resetUser();
          navigation.getParent()?.navigate("Auth");
        },
      },
    ]);

  const profile = me.data?.profile;
  const user = me.data?.user;
  const emailPrefix = (user?.email || "").split("@")[0];

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFILE</Text>
      </View>

      {me.loading ? (
        <ActivityIndicator color={COLORS.teal} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.identity}>
            {/* Buyers have no profile photo yet — initials with a camera badge. */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(profile?.fullName || "")}</Text>
              </View>
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={() => Alert.alert("Coming soon", "Profile photos are coming soon.")}
                hitSlop={6}
              >
                <Ionicons name="camera" size={12} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.name}>{profile?.fullName || "Buyer"}</Text>
            {emailPrefix ? <Text style={styles.handle}>@{emailPrefix}</Text> : null}
          </View>

          <View style={styles.card}>
            <MenuRow
              icon="person-outline"
              title="Personal information"
              subtitle="Manage your details to keep account up to date"
              onPress={() => navigation.navigate("BuyerPersonalInfo")}
            />
            <MenuRow
              icon="storefront-outline"
              title="Activate Vendor mode"
              subtitle="Sell clothes, shoes, bags and earn money"
              divider
              right={
                switching ? (
                  <ActivityIndicator size="small" color={COLORS.teal} />
                ) : (
                  <Switch
                    value={vendorSwitchOn}
                    onValueChange={onVendorToggle}
                    trackColor={{ false: COLORS.line, true: COLORS.teal }}
                    thumbColor={COLORS.white}
                  />
                )
              }
            />
            <MenuRow
              icon="notifications-outline"
              title="Notification"
              subtitle="Stay updated with real-time updates"
              divider
              right={
                // Honest note: this preference is persisted on the device but
                // push notifications are not wired up yet — UI-only for now.
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: COLORS.line, true: COLORS.teal }}
                  thumbColor={COLORS.white}
                />
              }
            />
          </View>

          <View style={styles.card}>
            <MenuRow
              icon="headset-outline"
              title="Contact Support"
              subtitle="We're here to help, reach us any time"
              onPress={() => navigation.navigate("BuyerSupport")}
            />
            <MenuRow
              icon="lock-closed-outline"
              title="Privacy Policy"
              subtitle="How we collect, use and protect your data"
              divider
              onPress={() => navigation.navigate("BuyerPrivacy")}
            />
            <MenuRow
              icon="document-text-outline"
              title="Terms & Conditions"
              subtitle="The rules of using O-Fash Markett"
              divider
              onPress={() => navigation.navigate("BuyerTerms")}
            />
          </View>

          <View style={styles.card}>
            <MenuRow
              icon="log-out-outline"
              iconColor={COLORS.red}
              iconBg={COLORS.redSoft}
              title="Log out"
              titleColor={COLORS.red}
              subtitle="Want to take a break?"
              onPress={logout}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  scroll: { padding: 16, paddingBottom: 32 },
  identity: { alignItems: "center", marginVertical: 14 },
  avatarWrap: { width: 88, height: 88 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.tealDark,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.teal,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 10,
  },
  handle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.ink,
  },
  rowSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});

export default BuyerProfileTab;
