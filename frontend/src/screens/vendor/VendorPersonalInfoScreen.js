import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { vendorApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import { initials } from "../../utils/format";

// Boxed field matching the onboarding BoxedField style. Module scope only —
// defining it inside the screen would remount the TextInput every render.
const BoxedField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  right,
  editable = true,
  maxLength,
  autoCapitalize,
}) => (
  <View style={[styles.fieldBox, !editable && styles.fieldBoxDisabled]}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.innerLabel}>{label}</Text>
      {!editable ? <Ionicons name="lock-closed-outline" size={12} color={COLORS.faint} /> : null}
    </View>
    <View style={styles.fieldValueRow}>
      <TextInput
        style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.faint}
        keyboardType={keyboardType}
        editable={editable}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
      {right}
    </View>
  </View>
);

const VendorPersonalInfoScreen = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const personal = useFetch(() => vendorApi.personal(token), [token]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const savedTimer = useRef(null);

  const data = personal.data?.personal;

  useEffect(() => {
    if (data) {
      setFullName(data.fullName || "");
      setPhone(data.phone || "");
    }
  }, [data]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const dirty =
    Boolean(data) &&
    (fullName.trim() !== (data.fullName || "") || phone.trim() !== (data.phone || ""));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await vendorApi.updatePersonal(token, {
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      await personal.refresh();
      setSaved(true);
      savedTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <BackCircle onPress={() => navigation.goBack()} style={styles.back} />
        <Text style={styles.headerTitle}>PERSONAL INFORMATION</Text>
      </View>

      {personal.loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.teal} size="large" />
        </View>
      ) : personal.error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{personal.error.message}</Text>
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
                <Text style={styles.avatarText}>{initials(fullName || data?.email)}</Text>
              </View>
            </View>

            <BoxedField
              label="FULL NAME"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              maxLength={160}
            />
            <BoxedField
              label="PHONE NUMBER"
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              maxLength={14}
              right={<Text style={styles.phoneAdornment}>🇳🇬 +234</Text>}
            />
            <BoxedField label="EMAIL ADDRESS" value={data?.email || ""} editable={false} />

            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            {saved ? (
              <View style={styles.savedRow}>
                <Ionicons name="checkmark-circle" size={15} color={COLORS.green} />
                <Text style={styles.savedText}>Saved</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Save changes"
              onPress={save}
              disabled={!dirty}
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
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldInput: {
    flex: 1,
    marginTop: 4,
    fontSize: 15,
    color: COLORS.ink,
    padding: 0,
  },
  fieldInputDisabled: {
    color: COLORS.muted,
  },
  phoneAdornment: {
    fontSize: 13,
    color: COLORS.slate,
  },
  inlineError: {
    marginTop: 12,
    fontSize: 12.5,
    color: COLORS.red,
    textAlign: "center",
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 12,
  },
  savedText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.green,
  },
  saveButton: {
    marginTop: 18,
  },
});

export default VendorPersonalInfoScreen;
