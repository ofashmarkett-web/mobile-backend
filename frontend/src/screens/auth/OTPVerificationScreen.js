import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { authApi, onboardingApi, resolveRoleLanding } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { COLORS } from "../../theme/colors";
import { IS_RIDER_APP } from "../../config/appVariant";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 45;
const emptyCode = () => Array(CODE_LENGTH).fill("");

const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const OTPVerificationScreen = ({ navigation, route }) => {
  const setSession = useUserStore((state) => state.setSession);
  const resetUser = useUserStore((state) => state.resetUser);
  const inputs = useRef([]);
  const [code, setCode] = useState(emptyCode());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const { channel = "phone", phone, email, role = "buyer", profile, isLogin } = route.params || {};
  const destination = isLogin ? "ProfileSwitch" : role === "vendor" ? "Vendor" : "LegalAgreement";

  useEffect(() => {
    if (secondsLeft <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleVerify = async (otp) => {
    if (isSubmitting) {
      return;
    }

    if (otp.length !== CODE_LENGTH) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const session = await authApi.verifyOtp({
        email,
        phone,
        otp,
        role,
        mode: isLogin ? "login" : "register",
      });
      setSession({ token: session.token, user: session.user });

      // On login the server's stored role is the truth — route by it, so a
      // vendor who logs in through the shop toggle still lands on their store.
      if (isLogin) {
        const storedRole = session.user?.role;
        const parent = navigation.getParent?.();

        // Each app variant only serves its own roles — wrong-app logins are
        // signed out with a pointer to the right app.
        if (!IS_RIDER_APP && storedRole === "rider") {
          resetUser();
          setError("Rider accounts use the O-Fash Rider app.");
          return;
        }

        if (IS_RIDER_APP && storedRole !== "rider") {
          resetUser();
          setError(
            "This is the O-Fash Rider app — use the main O-Fash Markett app to shop or sell.",
          );
          return;
        }

        if (storedRole === "vendor" || storedRole === "rider") {
          // Returning users who finished onboarding go straight to their
          // dashboard — not back through KYC.
          const screen = await resolveRoleLanding(session.token, storedRole);
          parent?.replace(storedRole === "vendor" ? "Vendor" : "Rider", { screen });
        } else {
          parent?.replace("Buyer");
        }
        return;
      }

      if (!isLogin && profile) {
        if (role === "buyer") {
          await onboardingApi.saveBuyer(session.token, profile);
        } else if (role === "vendor") {
          await onboardingApi.saveVendor(session.token, {
            fullName: profile.fullName,
            businessName: "",
            onboardingStatus: "draft",
          });
        } else if (role === "rider") {
          await onboardingApi.saveRider(session.token, {
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            onboardingStatus: "draft",
          });
        }
      }

      const parent = navigation.getParent?.();

      if (destination === "Vendor") {
        parent?.navigate("Vendor", { screen: "VendorStart" });
        return;
      }

      if (!isLogin && role === "rider") {
        parent?.navigate("Rider", { screen: "RiderStart" });
        return;
      }

      navigation.navigate(destination);
    } catch (requestError) {
      setError(requestError.message);
      setCode(emptyCode());
      inputs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (value, index) => {
    const digits = value.replace(/\D/g, "");

    // Pasted (or auto-filled) multi-digit code: distribute across the boxes.
    if (digits.length > 1) {
      const nextCode = emptyCode();
      digits
        .slice(0, CODE_LENGTH)
        .split("")
        .forEach((digit, position) => {
          nextCode[position] = digit;
        });
      setCode(nextCode);

      const lastFilled = Math.min(digits.length, CODE_LENGTH) - 1;
      inputs.current[lastFilled]?.focus();

      if (digits.length >= CODE_LENGTH) {
        handleVerify(digits.slice(0, CODE_LENGTH));
      }
      return;
    }

    const nextCode = [...code];
    nextCode[index] = digits;
    setCode(nextCode);

    if (digits && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (digits && index === CODE_LENGTH - 1) {
      const otp = nextCode.join("");
      if (otp.length === CODE_LENGTH) {
        handleVerify(otp);
      }
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      const nextCode = [...code];
      nextCode[index - 1] = "";
      setCode(nextCode);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (isResending) {
      return;
    }

    setIsResending(true);
    setError("");

    try {
      await authApi.sendOtp({ email, phone });
      setCode(emptyCode());
      setSecondsLeft(RESEND_SECONDS);
      inputs.current[0]?.focus();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={18} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>
            Verify your {channel === "email" ? "email address" : "phone number"}
          </Text>
          <Text style={styles.subtitle}>
            A verification code has been sent to {channel === "email" ? email : phone}. Please
            enter the code in the field below.
          </Text>

          <View style={styles.codeRow}>
            {code.map((digit, index) => (
              <RNTextInput
                key={`otp-${index}`}
                ref={(input) => {
                  inputs.current[index] = input;
                }}
                value={digit}
                onChangeText={(value) => handleChange(value, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? CODE_LENGTH : 1}
                autoFocus={index === 0}
                editable={!isSubmitting}
                style={[
                  styles.codeBox,
                  (focusedIndex === index || digit) && styles.codeBoxActive,
                ]}
              />
            ))}
          </View>

          {isSubmitting ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={COLORS.teal} />
              <Text style={styles.statusText}>Verifying…</Text>
            </View>
          ) : secondsLeft > 0 ? (
            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>{formatCountdown(secondsLeft)}</Text>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={handleResend} disabled={isResending}>
              {isResending ? (
                <ActivityIndicator size="small" color={COLORS.teal} />
              ) : (
                <Text style={styles.resendText}>Resend code</Text>
              )}
            </TouchableOpacity>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  content: {
    alignItems: "center",
    paddingTop: 54,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 16,
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
    marginBottom: 22,
  },
  codeBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.ink,
    backgroundColor: COLORS.white,
  },
  codeBoxActive: {
    borderColor: COLORS.teal,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.slate,
  },
  countdownPill: {
    backgroundColor: COLORS.grey,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.slate,
    letterSpacing: 0.5,
  },
  resendText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.teal,
  },
  errorText: {
    marginTop: 14,
    color: COLORS.red,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 16,
  },
});

export default OTPVerificationScreen;
