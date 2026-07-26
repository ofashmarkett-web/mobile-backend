import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import BackCircle from "../../components/kyc/BackCircle";
import PrimaryButton from "../../components/vendor/PrimaryButton";
import { buyerApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import { initials } from "../../utils/format";

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ordinal = (n) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
};

// Render the stored free-text DOB ("16/01/1998", "16-01-98", "1998-01-16") as
// "16th January 1998" — fall back to the raw string when unparseable.
const formatDob = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "—";

  let day;
  let month;
  let year;
  const dmy = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
    // Two-digit years: buyers are adults, so anything after the current
    // two-digit year belongs to the 1900s.
    if (year < 100) year += year > new Date().getFullYear() % 100 ? 1900 : 2000;
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  }

  if (!day || !month || month > 12 || day > 31) return value;
  return `${ordinal(day)} ${FULL_MONTHS[month - 1]} ${year}`;
};

// Boxed field matching the onboarding/vendor BoxedField style. Module scope
// only — defining it inside the screen would remount the TextInput each render.
const BoxedField = ({ label, value, onChangeText, placeholder, editable = false, multiline }) => (
  <View style={[styles.fieldBox, !editable && styles.fieldBoxDisabled]}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.innerLabel}>{label}</Text>
      {!editable ? <Ionicons name="lock-closed-outline" size={12} color={COLORS.faint} /> : null}
    </View>
    {editable ? (
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.faint}
        multiline={multiline}
        autoCapitalize={multiline ? "sentences" : "words"}
        maxLength={multiline ? 500 : 160}
      />
    ) : (
      <Text style={styles.fieldValue}>{value || "—"}</Text>
    )}
  </View>
);

const BuyerPersonalInfoScreen = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const me = useFetch(() => buyerApi.me(token), [token]);

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const profile = me.data?.profile;
  const user = me.data?.user;

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setAddress(profile.defaultAddress || "");
    }
  }, [profile]);

  const dirty =
    Boolean(profile) &&
    (fullName.trim() !== (profile.fullName || "") ||
      address.trim() !== (profile.defaultAddress || ""));

  const save = async () => {
    setSaving(true);
    try {
      await buyerApi.updateMe(token, {
        fullName: fullName.trim(),
        defaultAddress: address.trim(),
      });
      await me.refresh();
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (error) {
      Alert.alert("Could not save", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <BackCircle onPress={() => navigation.goBack()} style={styles.back} />
        <Text style={styles.headerTitle}>PROFILE INFORMATION</Text>
      </View>

      {me.loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.teal} size="large" />
        </View>
      ) : me.error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{me.error.message}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(fullName || user?.email)}</Text>
              </View>
            </View>

            <BoxedField
              label="FULL NAME"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              editable
            />
            <BoxedField label="PHONE NUMBER" value={user?.phone || ""} />
            <BoxedField label="EMAIL ADDRESS" value={user?.email || ""} />
            <BoxedField label="DATE OF BIRTH" value={formatDob(profile?.dateOfBirth)} />
            <BoxedField label="GENDER" value={profile?.gender || ""} />
            <BoxedField
              label="DEFAULT DELIVERY ADDRESS"
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 22 Bode Thomas, Surulere, Lagos"
              editable
              multiline
            />

            <PrimaryButton
              label="Save changes"
              onPress={save}
              disabled={!dirty || !fullName.trim()}
              loading={saving}
              style={styles.saveButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: COLORS.slate, textAlign: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  back: {
    position: "absolute",
    left: 16,
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
  avatarWrap: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.teal,
  },
  fieldBox: {
    marginTop: 12,
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  fieldBoxDisabled: {
    backgroundColor: COLORS.surface,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  innerLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },
  fieldInput: {
    marginTop: 4,
    fontSize: 15,
    color: COLORS.ink,
    padding: 0,
  },
  fieldInputMultiline: {
    minHeight: 56,
    textAlignVertical: "top",
  },
  fieldValue: {
    marginTop: 4,
    fontSize: 15,
    color: COLORS.muted,
  },
  saveButton: {
    marginTop: 18,
  },
});

export default BuyerPersonalInfoScreen;
