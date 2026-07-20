import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

const SUPPORT_EMAIL = "contact@o-fashmarkett.com";
// Placeholder support line until the real number is provisioned.
const SUPPORT_PHONE_DISPLAY = "+234 800 000 0000";
const SUPPORT_PHONE_TEL = "+2348000000000";
const SUPPORT_WHATSAPP = "2348000000000";

const openLink = (url) => Linking.openURL(url).catch(() => {});

const SupportRow = ({ icon, title, subtitle, onPress, divider, iconColor }) => (
  <TouchableOpacity
    style={[styles.row, divider && styles.rowDivider]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={19} color={iconColor || COLORS.teal} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />
  </TouchableOpacity>
);

const VendorSupportScreen = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const store = useFetch(() => vendorApi.store(token), [token]);
  const [feedback, setFeedback] = useState("");

  const storeHandle = store.data?.store?.storeHandle || "vendor";
  const supportSubject = `O-Fash vendor support — ${storeHandle}`;

  const emailSupport = () =>
    openLink(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(supportSubject)}`);

  const sendFeedback = () => {
    const subject = `O-Fash vendor feedback — ${storeHandle}`;
    openLink(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        feedback.trim(),
      )}`,
    );
  };

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <BackCircle onPress={() => navigation.goBack()} style={styles.back} />
        <Text style={styles.headerTitle}>CONTACT SUPPORT</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.introTitle}>We're here to help</Text>
          <Text style={styles.introCopy}>
            Reach us any time — we typically reply within a few hours.
          </Text>

          <View style={styles.card}>
            <SupportRow
              icon="mail-outline"
              title="Email support"
              subtitle={SUPPORT_EMAIL}
              onPress={emailSupport}
            />
            <SupportRow
              icon="call-outline"
              title="Call us"
              subtitle={SUPPORT_PHONE_DISPLAY}
              onPress={() => openLink(`tel:${SUPPORT_PHONE_TEL}`)}
              divider
            />
            <SupportRow
              icon="logo-whatsapp"
              title="WhatsApp"
              subtitle="Chat with us on WhatsApp"
              iconColor={COLORS.green}
              onPress={() => openLink(`https://wa.me/${SUPPORT_WHATSAPP}`)}
              divider
            />
          </View>

          <Text style={styles.feedbackTitle}>We listen, we don't judge</Text>
          <View style={styles.feedbackBox}>
            <TextInput
              style={styles.feedbackInput}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Let us know how you want us to improve to serve you better"
              placeholderTextColor={COLORS.faint}
              multiline
              maxLength={1000}
            />
          </View>
          <PrimaryButton
            label="Send"
            onPress={sendFeedback}
            disabled={!feedback.trim()}
            style={styles.sendButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
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
  introTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 8,
  },
  introCopy: {
    fontSize: 12.5,
    color: COLORS.slate,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 14,
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
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  rowSubtitle: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  feedbackTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
    marginTop: 24,
  },
  feedbackBox: {
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    minHeight: 110,
  },
  feedbackInput: {
    fontSize: 13.5,
    color: COLORS.ink,
    padding: 0,
    minHeight: 80,
    textAlignVertical: "top",
  },
  sendButton: {
    marginTop: 14,
  },
});

export default VendorSupportScreen;
