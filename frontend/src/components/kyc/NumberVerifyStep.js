import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import BackCircle from "./BackCircle";
import PillButton from "./PillButton";
import ResultSheet from "./ResultSheet";

/**
 * Shared numeric identity check step (NIN, BVN, ...). Role-agnostic.
 *
 * Props:
 * - label: short uppercase id name shown inside the input box and in the
 *   result badges, e.g. "NIN" or "BVN"
 * - title, subtitle: header copy
 * - length: required digit count (default 11)
 * - verifyLabel: CTA label (default `Verify ${label}`)
 * - busyLabel: CTA label while the check runs
 *   (default `Verifying your ${label}... almost done`)
 * - onVerify: async (digits) => ({ state: "success" | "failed" | "not_found" })
 * - onSuccess: called when the user taps Continue on the success sheet
 * - onBack
 * - successHeading / successMessage / failedHeading / failedMessage /
 *   notFoundHeading / notFoundMessage: overridable result copy
 */
const NumberVerifyStep = ({
  label,
  title,
  subtitle,
  length = 11,
  verifyLabel,
  busyLabel,
  onVerify,
  onSuccess,
  onBack,
  successHeading = "Locked in! \u{1F512}",
  successMessage = "You are almost there",
  failedHeading = "That didn't match",
  failedMessage,
  notFoundHeading = "We couldn't find it",
  notFoundMessage,
}) => {
  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // null | "success" | "failed" | "not_found"

  const ready = digits.length === length;

  const handleVerify = async () => {
    if (!ready || busy) return;
    setBusy(true);

    let outcome;
    try {
      outcome = await onVerify(digits);
    } catch (error) {
      outcome = { state: "failed" };
    }

    setBusy(false);
    const state = ["success", "failed", "not_found"].includes(outcome?.state)
      ? outcome.state
      : "failed";
    setResult(state);
  };

  const dismiss = () => setResult(null);
  const finishSuccess = () => {
    setResult(null);
    onSuccess?.(digits);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackCircle onPress={onBack} />
          <Text style={styles.title}>{title || `Enter your ${label}`}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
              style={styles.input}
              value={digits}
              onChangeText={(value) => setDigits(value.replace(/\D/g, "").slice(0, length))}
              keyboardType="number-pad"
              maxLength={length}
              placeholder={"•".repeat(length)}
              placeholderTextColor={COLORS.faint}
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <PillButton
            label={verifyLabel || `Verify ${label}`}
            busyLabel={busyLabel || `Verifying your ${label}... almost done`}
            busy={busy}
            disabled={!ready}
            onPress={handleVerify}
          />
        </View>
      </KeyboardAvoidingView>

      <ResultSheet
        visible={result === "success"}
        tone="success"
        badge={`${label} VERIFICATION SUCCESSFUL`}
        icon="shield-checkmark"
        heading={successHeading}
        message={successMessage}
        actionLabel="Continue"
        onAction={finishSuccess}
        onDismiss={finishSuccess}
      />
      <ResultSheet
        visible={result === "failed"}
        tone="failed"
        badge={`${label} VERIFICATION FAILED`}
        icon="close"
        heading={failedHeading}
        message={
          failedMessage ||
          `The ${label} you entered is not matching on our end. Take another look and retry.`
        }
        actionLabel="Retry"
        onAction={dismiss}
        onDismiss={dismiss}
      />
      <ResultSheet
        visible={result === "not_found"}
        tone="warning"
        badge={`${label} NOT FOUND`}
        icon="search"
        heading={notFoundHeading}
        message={
          notFoundMessage ||
          `We couldn't pull this up. Make sure the number is correct or check your ${label} slip.`
        }
        actionLabel="Continue"
        onAction={dismiss}
        onDismiss={dismiss}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.ink,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.slate,
  },
  inputBox: {
    marginTop: 26,
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.muted,
    textTransform: "uppercase",
  },
  input: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3,
    color: COLORS.ink,
    padding: 0,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
  },
});

export default NumberVerifyStep;
