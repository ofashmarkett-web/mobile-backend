import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { disputeApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import { formatDate, formatTime, naira, timeAgo } from "../../utils/format";

const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under review" },
  { key: "resolved", label: "Resolved" },
];

const STEP_COMPLETION = { submitted: 1, under_review: 2, resolved: 3 };

// Three-step dispute progress tracker: teal filled circles with white checks
// for completed steps, light gray circles for the ones still ahead.
const DisputeProgress = ({ status }) => {
  const done = STEP_COMPLETION[status] || 1;

  return (
    <View style={styles.progressRow}>
      {STEPS.map((step, index) => {
        const complete = index < done;

        return (
          <React.Fragment key={step.key}>
            {index > 0 ? <View style={styles.progressLine} /> : null}
            <View style={styles.progressStep}>
              <View style={[styles.progressCircle, complete && styles.progressCircleDone]}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={complete ? COLORS.white : COLORS.faint}
                />
              </View>
              <Text style={[styles.progressLabel, complete && styles.progressLabelDone]}>
                {step.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const InfoRow = ({ icon, label, value, divider }) => (
  <View style={[styles.infoRow, divider && styles.infoDivider]}>
    <View style={styles.infoIconLabel}>
      <Ionicons name={icon} size={16} color={COLORS.muted} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const DisputeDetailScreen = ({ navigation, route }) => {
  const { disputeId } = route.params;
  const token = useUserStore((state) => state.token);
  const detail = useFetch(() => disputeApi.get(token, disputeId), [token, disputeId]);
  const dispute = detail.data?.dispute;

  if (detail.loading || !dispute) {
    return (
      <View style={styles.center}>
        {detail.error ? (
          <Text style={styles.errorText}>{detail.error.message}</Text>
        ) : (
          <ActivityIndicator color={COLORS.teal} size="large" />
        )}
      </View>
    );
  }

  const order = dispute.order || {};
  const evidence = dispute.evidenceImages || [];

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backCircle}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={18} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.holdBanner}>
          <View style={styles.lockIconWrap}>
            <Ionicons name="lock-closed" size={16} color={COLORS.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.holdAmount}>{naira(dispute.amountHeld)} on hold</Text>
            <Text style={styles.holdCopy}>
              Held in escrow until this dispute is resolved. No one is paid out yet.
            </Text>
          </View>
        </View>

        <DisputeProgress status={dispute.status} />

        <View style={styles.infoCard}>
          <InfoRow icon="person-outline" label="Buyer" value={dispute.buyerName} />
          <InfoRow
            icon="calendar-outline"
            label="Order date"
            value={formatDate(order.createdAt)}
            divider
          />
          <InfoRow icon="time-outline" label="Time" value={formatTime(order.createdAt)} divider />
          <InfoRow
            icon="document-text-outline"
            label="Filed"
            value={timeAgo(dispute.createdAt)}
            divider
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.muted} />
            <Text style={styles.sectionLabel}>Reason</Text>
          </View>
          <Text style={styles.reasonTitle}>{dispute.reason}</Text>
          {dispute.detail ? <Text style={styles.reasonDetail}>{dispute.detail}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Evidence</Text>
          {evidence.length ? (
            <View style={styles.evidenceList}>
              {evidence.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.evidenceImage} />
              ))}
            </View>
          ) : (
            <Text style={styles.noEvidence}>No photos attached.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  errorText: { color: COLORS.slate, padding: 24, textAlign: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  backCircle: {
    position: "absolute",
    left: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  holdBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.amberSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  lockIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  holdAmount: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.red,
  },
  holdCopy: {
    fontSize: 11.5,
    color: COLORS.slate,
    marginTop: 2,
    lineHeight: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  progressStep: {
    alignItems: "center",
    width: 76,
  },
  progressCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleDone: {
    backgroundColor: COLORS.teal,
  },
  progressLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.line,
    marginTop: 17,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.faint,
    marginTop: 6,
    textAlign: "center",
  },
  progressLabelDone: {
    color: COLORS.ink,
    fontWeight: "600",
  },
  infoCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    gap: 12,
  },
  infoDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  infoIconLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.ink,
    flexShrink: 1,
    textAlign: "right",
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 2,
  },
  reasonTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 4,
  },
  reasonDetail: {
    fontSize: 12.5,
    color: COLORS.muted,
    lineHeight: 18,
  },
  evidenceList: {
    gap: 10,
    marginTop: 6,
  },
  evidenceImage: {
    width: "100%",
    aspectRatio: 1.4,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    resizeMode: "cover",
  },
  noEvidence: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 4,
  },
});

export default DisputeDetailScreen;
