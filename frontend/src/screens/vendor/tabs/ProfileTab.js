import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { SHADOWS } from "../../../theme/shadows";
import { vendorApi, uploadApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import ProductThumb from "../../../components/vendor/ProductThumb";
import PrimaryButton from "../../../components/vendor/PrimaryButton";
import * as ImagePicker from "expo-image-picker";

const MenuRow = ({ icon, title, subtitle, onPress, right, iconSet = "ion" }) => (
  <TouchableOpacity
    style={styles.menuRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuIcon}>
      {iconSet === "mci" ? (
        <MaterialCommunityIcons name={icon} size={19} color={COLORS.slate} />
      ) : (
        <Ionicons name={icon} size={19} color={COLORS.slate} />
      )}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
    </View>
    {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.faint} /> : null)}
  </TouchableOpacity>
);

const ProfileTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const userMetadata = useUserStore((state) => state.userMetadata);
  const resetUser = useUserStore((state) => state.resetUser);
  const store = useFetch(() => vendorApi.store(token), [token]);
  const [busy, setBusy] = useState(false);

  const data = store.data?.store;
  const isLive = Boolean(data?.isLive);

  const toggleLive = async (value) => {
    setBusy(true);
    try {
      await vendorApi.updateStore(token, { isLive: value });
      await store.refresh();
    } catch (error) {
      Alert.alert("Could not update store", error.message);
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setBusy(true);
    try {
      const uploaded = await uploadApi.images(token, [result.assets[0]]);
      await vendorApi.updateStore(token, { storeLogoUrl: uploaded.urls[0] });
      await store.refresh();
    } catch (error) {
      Alert.alert("Could not update photo", error.message);
    } finally {
      setBusy(false);
    }
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

  const displayName =
    [userMetadata?.profile?.firstName, userMetadata?.profile?.lastName]
      .filter(Boolean)
      .join(" ") || data?.businessName;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFILE</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={store.refreshing} onRefresh={store.refresh} />}
      >
        {store.loading ? (
          <ActivityIndicator color={COLORS.teal} style={{ marginTop: 60 }} size="large" />
        ) : (
          <>
            <View style={styles.identity}>
              <TouchableOpacity onPress={changeAvatar} disabled={busy}>
                {data?.storeLogoUrl ? (
                  <ProductThumb uri={data.storeLogoUrl} size={92} radius={46} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={40} color={COLORS.faint} />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Ionicons name="pencil" size={12} color={COLORS.white} />
                </View>
              </TouchableOpacity>
              <Text style={styles.name}>{displayName || "Your store"}</Text>
              {data?.storeHandle ? (
                <Text style={styles.handle}>@{data.storeHandle}</Text>
              ) : null}
              {data && !data.verification?.verified ? (
                <View style={styles.verifyBadge}>
                  <Ionicons name="shield-half-outline" size={12} color={COLORS.amber} />
                  <Text style={styles.verifyText}>Verification pending</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.menuCard}>
              <MenuRow
                icon="person-outline"
                title="Personal Information"
                subtitle="Manage your details to keep account up to date"
                onPress={() => navigation.navigate("VendorPersonalInfo")}
              />
              <MenuRow
                icon="storefront-outline"
                iconSet="mci"
                title="Store live mode"
                subtitle="Sell clothes, shoes, bags and earn money"
                right={
                  <Switch
                    value={isLive}
                    onValueChange={toggleLive}
                    disabled={busy}
                    trackColor={{ false: COLORS.line, true: COLORS.teal }}
                    thumbColor={COLORS.white}
                  />
                }
              />
              <MenuRow
                icon="notifications-outline"
                title="Notification"
                subtitle="Stay updated with real time updates"
                onPress={() => navigation.navigate("VendorNotifications")}
              />
            </View>

            <View style={styles.menuCard}>
              <MenuRow
                icon="headset-outline"
                title="Contact Support"
                subtitle="Got an issue? We're here for you"
                onPress={() => navigation.navigate("VendorSupport")}
              />
              <MenuRow
                icon="lock-closed-outline"
                title="Privacy Policy"
                subtitle="How we collect and protect your data"
                onPress={() => navigation.navigate("VendorPrivacy")}
              />
              <MenuRow
                icon="document-text-outline"
                title="Terms & Conditions"
                subtitle="The rules of the road for using O-Fash Markett"
                onPress={() => navigation.navigate("VendorTerms")}
              />
              <MenuRow
                icon="log-out-outline"
                title="Log out"
                subtitle="Want to take a break?"
                onPress={logout}
              />
            </View>

            <PrimaryButton
              label="Switch to buyer mode"
              onPress={() =>
                Alert.alert(
                  "Switch to buyer mode",
                  "You'll browse the market as a buyer. Your store stays exactly as you left it.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Switch",
                      onPress: () => navigation.getParent()?.navigate("Buyer"),
                    },
                  ],
                )
              }
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  identity: {
    alignItems: "center",
    marginVertical: 12,
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.grey,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 10,
  },
  handle: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.amberSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  verifyText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.amber,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 6,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 10,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  menuSubtitle: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
});

export default ProfileTab;
