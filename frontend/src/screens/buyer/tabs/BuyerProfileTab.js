import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../theme/colors";
import { SHADOWS } from "../../../theme/shadows";
import { buyerApi } from "../../../services/apiClient";
import { useUserStore } from "../../../store/userStore";
import { useFetch } from "../../../hooks/useFetch";
import PrimaryButton from "../../../components/vendor/PrimaryButton";
import { initials } from "../../../utils/format";

const BuyerProfileTab = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const resetUser = useUserStore((state) => state.resetUser);
  const me = useFetch(() => buyerApi.me(token), [token]);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (me.data?.profile?.defaultAddress) setAddress(me.data.profile.defaultAddress);
  }, [me.data?.profile?.defaultAddress]);

  const saveAddress = async () => {
    setSaving(true);
    try {
      await buyerApi.updateMe(token, { defaultAddress: address });
      Alert.alert("Saved", "Your delivery address has been updated.");
    } catch (error) {
      Alert.alert("Could not save", error.message);
    } finally {
      setSaving(false);
    }
  };

  const profile = me.data?.profile;
  const user = me.data?.user;

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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(profile?.fullName || "")}</Text>
            </View>
            <Text style={styles.name}>{profile?.fullName || "Buyer"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={16} color={COLORS.teal} />
              <Text style={styles.cardTitle}>Default delivery address</Text>
            </View>
            <TextInput
              style={styles.addressInput}
              placeholder="e.g. 22 Bode Thomas, Surulere, Lagos"
              placeholderTextColor={COLORS.faint}
              value={address}
              onChangeText={setAddress}
              multiline
            />
            <PrimaryButton label="Save address" onPress={saveAddress} loading={saving} />
          </View>

          <PrimaryButton
            label="Become a Vendor"
            variant="outline"
            style={{ marginBottom: 12 }}
            onPress={() =>
              Alert.alert(
                "Become a Vendor",
                "You'll set up your store and switch to the vendor workspace.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Continue", onPress: () => navigation.getParent()?.navigate("Vendor") },
                ],
              )
            }
          />

          <PrimaryButton
            label="Log out"
            variant="danger-outline"
            onPress={() =>
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
              ])
            }
          />
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
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 10,
  },
  email: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: COLORS.ink,
    minHeight: 64,
    textAlignVertical: "top",
    marginBottom: 12,
  },
});

export default BuyerProfileTab;
