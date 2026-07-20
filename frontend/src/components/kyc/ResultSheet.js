import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import PillButton from "./PillButton";

const TONES = {
  success: { main: COLORS.green, soft: COLORS.greenSoft },
  failed: { main: COLORS.red, soft: COLORS.redSoft },
  warning: { main: COLORS.amber, soft: COLORS.amberSoft },
};

/**
 * Bottom-sheet result modal for KYC checks: rounded-top card sliding over a
 * dimmed background with a drag-handle bar, a small status pill badge, a big
 * circular icon with soft glow rings, heading + copy, and a pill CTA.
 *
 * Props:
 * - visible, onDismiss (tap on scrim)
 * - tone: "success" | "failed" | "warning"
 * - badge: uppercase pill text (e.g. "NIN VERIFICATION SUCCESSFUL")
 * - icon: Ionicons name for the circle
 * - heading, message
 * - actionLabel, onAction
 */
const ResultSheet = ({
  visible,
  tone = "success",
  badge,
  icon = "shield-checkmark",
  heading,
  message,
  actionLabel = "Continue",
  onAction,
  onDismiss,
}) => {
  const palette = TONES[tone] || TONES.success;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.scrim}>
        <Pressable style={styles.scrimTouch} onPress={onDismiss} />
        <View style={[styles.card, SHADOWS.sheet]}>
          <View style={styles.handle} />
          {badge ? (
            <View style={[styles.badge, { backgroundColor: palette.soft }]}>
              <Text style={[styles.badgeText, { color: palette.main }]}>{badge}</Text>
            </View>
          ) : null}
          <View style={[styles.glowOuter, { backgroundColor: palette.soft }]}>
            <View style={[styles.glowInner, { backgroundColor: `${palette.main}26` }]}>
              <View style={[styles.iconCircle, { backgroundColor: palette.main }]}>
                <Ionicons name={icon} size={44} color={COLORS.white} />
              </View>
            </View>
          </View>
          {heading ? <Text style={styles.heading}>{heading}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <PillButton label={actionLabel} onPress={onAction} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    justifyContent: "flex-end",
  },
  scrimTouch: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
    alignItems: "center",
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.line,
    marginBottom: 18,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  glowOuter: {
    width: 172,
    height: 172,
    borderRadius: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  glowInner: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.slate,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  button: {
    alignSelf: "stretch",
    marginTop: 22,
  },
});

export default ResultSheet;
