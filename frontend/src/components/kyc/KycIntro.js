import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import BackCircle from "./BackCircle";
import PillButton from "./PillButton";

const DEFAULT_ICONS = ["card-outline", "document-text-outline", "happy-outline"];

/**
 * Role-agnostic KYC intro screen.
 *
 * Props:
 * - subtitle: gray copy under the title
 * - items: array of strings (or { icon, text }) shown as the
 *   "WHAT TO HAVE READY" checklist
 * - onProceed: pill CTA handler
 * - onBack: optional; hides the back circle when omitted
 * - title, proceedLabel: overridable copy
 */
const KycIntro = ({
  title = "Verify your identity, this takes about 2 minutes",
  subtitle,
  items = [],
  proceedLabel = "Proceed to verification",
  onProceed,
  onBack,
}) => (
  <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {onBack ? <BackCircle onPress={onBack} /> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <Text style={styles.readyLabel}>WHAT TO HAVE READY</Text>
      {items.map((item, index) => {
        const text = typeof item === "string" ? item : item.text;
        const icon =
          (typeof item === "object" && item.icon) || DEFAULT_ICONS[index % DEFAULT_ICONS.length];

        return (
          <View key={text} style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name={icon} size={18} color={COLORS.teal} />
            </View>
            <Text style={styles.rowText}>{text}</Text>
          </View>
        );
      })}
    </ScrollView>
    <View style={styles.footer}>
      <PillButton label={proceedLabel} onPress={onProceed} />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    color: COLORS.ink,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.slate,
  },
  readyLabel: {
    marginTop: 30,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.ink,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
  },
});

export default KycIntro;
