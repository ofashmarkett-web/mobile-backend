import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStore } from "../../store/userStore";
import { authApi } from "../../services/apiClient";
import { COLORS } from "../../theme/colors";
import { IS_RIDER_APP } from "../../config/appVariant";

const segmentRoles = [
  { key: "buyer", label: "I'm here to shop" },
  { key: "vendor", label: "I'm here to sell" },
];

// Module-scope components only — defining these inside AuthScreen would give
// them a new identity every render, remounting the TextInput and closing the
// keyboard on each keystroke.
const Field = ({ label, right, ...inputProps }) => (
  <View style={styles.fieldBox}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <RNTextInput
        style={styles.fieldInput}
        placeholderTextColor={COLORS.muted}
        {...inputProps}
      />
      {right || null}
    </View>
  </View>
);

const PillButton = ({ label, onPress, enabled, loading }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    disabled={!enabled || loading}
    style={[styles.pillButton, { backgroundColor: enabled ? COLORS.teal : "#BDEEEE" }]}
  >
    {loading ? (
      <ActivityIndicator color={COLORS.white} />
    ) : (
      <Text style={styles.pillButtonLabel}>{label}</Text>
    )}
  </TouchableOpacity>
);

const AuthScreen = ({ navigation }) => {
  const setRole = useUserStore((state) => state.setRole);
  const patchUserMetadata = useUserStore((state) => state.patchUserMetadata);
  const patchNestedMetadata = useUserStore((state) => state.patchNestedMetadata);

  const [mode, setMode] = useState("register");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  // The rider app signs up riders only; the market app starts on "buyer".
  const [role, setSelectedRole] = useState(IS_RIDER_APP ? "rider" : "buyer");
  const [gender, setGender] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    referral: "",
  });

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleRoleChange = (nextRole) => {
    setSelectedRole(nextRole);
    setRole(nextRole);
  };

  const phoneDigits = form.phone.replace(/\D/g, "");
  const isEmailValid = /\S+@\S+\.\S+/.test(form.email.trim());
  const isPhoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11;
  const canRegister =
    form.fullName.trim().length > 2 &&
    form.dateOfBirth.trim().length >= 6 &&
    isEmailValid &&
    isPhoneValid &&
    Boolean(gender);
  const canLogin = isEmailValid;

  const handleRegister = async () => {
    if (!canRegister || isSubmitting) {
      if (!canRegister) {
        setError("Complete your name, phone, email, date of birth, and gender.");
      }
      return;
    }

    setIsSubmitting(true);
    setError("");
    const [firstName = "", ...rest] = form.fullName.trim().split(" ");

    setRole(role);
    patchUserMetadata({
      email: form.email,
      phone: form.phone,
      role,
    });
    patchNestedMetadata("profile", {
      firstName,
      lastName: rest.join(" "),
      gender,
      dateOfBirth: form.dateOfBirth,
      referral: form.referral,
    });

    try {
      await authApi.sendOtp({
        email: form.email.trim(),
        phone: form.phone.trim(),
        mode: "register",
      });
      navigation.navigate("OTPVerification", {
        // Phone OTP (SMS) isn't wired yet — the code goes to the email for now.
        channel: "email",
        role,
        phone: form.phone.trim(),
        email: form.email.trim(),
        profile: {
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth.trim(),
          gender,
          referral: form.referral.trim(),
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!canLogin || isSubmitting) {
      if (!canLogin) {
        setError("Enter a valid email address.");
      }
      return;
    }

    setIsSubmitting(true);
    setError("");
    patchUserMetadata({ email: form.email.trim(), role });

    try {
      await authApi.sendOtp({ email: form.email.trim(), mode: "login" });
      navigation.navigate("OTPVerification", {
        channel: "email",
        role,
        email: form.email.trim(),
        isLogin: true,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  const showBackButton = mode === "login" || navigation.canGoBack();

  const handleBack = () => {
    if (mode === "login") {
      switchMode("register");
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const isRegister = mode === "register";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showBackButton ? (
            <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={COLORS.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backSpacer} />
          )}

          <View style={styles.header}>
            <Text style={styles.title}>
              {isRegister
                ? "Set up your account."
                : IS_RIDER_APP
                  ? "Welcome back, Rider"
                  : "Welcome back, Shopper"}
            </Text>
            <Text style={styles.subtitle}>
              {isRegister
                ? "Create your account and start your O-Fash journey."
                : "Login and pick up right where you left off. Your vendors are waiting."}
            </Text>
          </View>

          {isRegister && !IS_RIDER_APP ? (
            <View style={styles.segment}>
              {segmentRoles.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.85}
                  onPress={() => handleRoleChange(item.key)}
                  style={[styles.segmentItem, role === item.key && styles.segmentItemActive]}
                >
                  <Text
                    style={[styles.segmentLabel, role === item.key && styles.segmentLabelActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {isRegister && IS_RIDER_APP ? (
            <View style={styles.riderBadge}>
              <MaterialCommunityIcons name="moped" size={14} color={COLORS.teal} />
              <Text style={styles.riderBadgeText}>Rider</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {isRegister ? (
              <>
                <Field
                  label="FULL NAME"
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChangeText={(value) => updateForm("fullName", value)}
                  autoCapitalize="words"
                />
                <Field
                  label="PHONE NUMBER"
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChangeText={(value) => updateForm("phone", value)}
                  keyboardType="phone-pad"
                  maxLength={14}
                  right={<Text style={styles.phoneAdornment}>🇳🇬 +234</Text>}
                />
              </>
            ) : null}

            <Field
              label="EMAIL ADDRESS"
              placeholder="Enter your email address"
              value={form.email}
              onChangeText={(value) => updateForm("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {isRegister ? (
              <>
                <Field
                  label="DATE OF BIRTH"
                  placeholder="dd/mm/yy"
                  value={form.dateOfBirth}
                  onChangeText={(value) => updateForm("dateOfBirth", value)}
                  maxLength={10}
                />

                <View style={styles.genderRow}>
                  {["Male", "Female"].map((item) => {
                    const selected = gender === item.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={item}
                        activeOpacity={0.85}
                        onPress={() => setGender(item.toLowerCase())}
                        style={styles.genderCard}
                      >
                        <MaterialCommunityIcons
                          name={selected ? "check-circle" : "checkbox-blank-circle-outline"}
                          size={20}
                          color={selected ? COLORS.teal : COLORS.faint}
                        />
                        <Text style={styles.genderLabel}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowReferral((open) => !open)}
                  style={styles.referralToggle}
                >
                  <Text style={styles.referralToggleText}>Add referral (Optional)</Text>
                  <Ionicons
                    name={showReferral ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>

                {showReferral ? (
                  <Field
                    label="REFERRAL"
                    placeholder="Who did you hear about us from?"
                    value={form.referral}
                    onChangeText={(value) => updateForm("referral", value)}
                  />
                ) : null}
              </>
            ) : null}
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <PillButton
            label={isRegister ? "Sign up" : "Login"}
            onPress={isRegister ? handleRegister : handleLogin}
            enabled={isRegister ? canRegister : canLogin}
            loading={isSubmitting}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => switchMode(isRegister ? "login" : "register")}
            style={styles.footerLink}
          >
            {isRegister ? (
              <Text style={styles.footerLinkMuted}>
                Already have an account? <Text style={styles.footerLinkStrong}>Login</Text>
              </Text>
            ) : (
              <Text style={styles.footerLinkMuted}>
                New here? <Text style={styles.footerLinkStrong}>Create account</Text>
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  backSpacer: {
    height: 32,
  },
  header: {
    marginTop: 22,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
  },
  segment: {
    height: 42,
    flexDirection: "row",
    padding: 3,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: COLORS.white,
  },
  segmentItemActive: {
    backgroundColor: COLORS.teal,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  segmentLabelActive: {
    color: COLORS.white,
  },
  riderBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: COLORS.tealSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  riderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.teal,
  },
  form: {
    gap: 12,
  },
  fieldBox: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
  },
  fieldLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  phoneAdornment: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 8,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderCard: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.ink,
  },
  referralToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  referralToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.slate,
  },
  errorBanner: {
    marginTop: 14,
    backgroundColor: COLORS.redSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  pillButton: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  pillButtonLabel: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  footerLink: {
    alignItems: "center",
  },
  footerLinkMuted: {
    fontSize: 12,
    color: COLORS.slate,
  },
  footerLinkStrong: {
    color: COLORS.teal,
    fontWeight: "700",
  },
});

export default AuthScreen;
