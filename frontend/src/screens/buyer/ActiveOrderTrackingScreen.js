import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../theme/colors";
import { buyerApi, disputeApi, orderApi, uploadApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import ProductThumb from "../../components/vendor/ProductThumb";
import StatusPill from "../../components/vendor/StatusPill";
import ProgressSteps from "../../components/vendor/ProgressSteps";
import PrimaryButton from "../../components/vendor/PrimaryButton";
import BottomSheet from "../../components/vendor/BottomSheet";
import { formatDate, formatTime, naira, ORDER_STATUS_META } from "../../utils/format";

const DISPUTE_REASONS = ["Item damaged", "Wrong item", "Not as described", "Size / fit issue"];

// Same camera/gallery picker pattern as vendor onboarding & AddListingScreen.
const pickEvidencePhoto = async (onPicked) => {
  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Allow camera access to photograph the issue.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled) onPicked(result.assets[0]);
  };

  const fromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow photo access to attach evidence.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) onPicked(result.assets[0]);
  };

  Alert.alert("Add evidence photo", "Photos of the issue help resolve disputes faster.", [
    { text: "Take photo", onPress: fromCamera },
    { text: "Choose from gallery", onPress: fromGallery },
    { text: "Cancel", style: "cancel" },
  ]);
};

const BUYER_BANNERS = {
  pending: {
    bg: COLORS.amberSoft,
    color: COLORS.amber,
    icon: "hourglass-outline",
    title: "Waiting for the vendor",
    subtitle: "The vendor is reviewing your order. Your payment is held safely in escrow.",
  },
  packaging: {
    bg: COLORS.blueSoft,
    color: COLORS.blue,
    icon: "cube-outline",
    title: "Your order is being prepared",
    subtitle: "The vendor has accepted and is packing your item.",
  },
  ready_for_pickup: {
    bg: COLORS.blueSoft,
    color: COLORS.blue,
    icon: "cube-outline",
    title: "Your order is being prepared",
    subtitle: "A rider is being matched to collect your item.",
  },
  shipped: {
    bg: COLORS.orangeSoft,
    color: COLORS.orange,
    icon: "bicycle-outline",
    title: "On its way to you",
    subtitle: "A rider has picked up your item and is heading your way.",
  },
  delivered: {
    bg: COLORS.greenSoft,
    color: COLORS.green,
    icon: "checkmark-circle-outline",
    title: "Package delivered",
    subtitle: "Confirm delivery or initiate return.",
  },
  completed: {
    bg: COLORS.greenSoft,
    color: COLORS.green,
    icon: "checkmark-done-outline",
    title: "Order completed",
    subtitle: "Payment has been released to the vendor. Thanks for shopping!",
  },
  declined: {
    bg: COLORS.redSoft,
    color: COLORS.red,
    icon: "close-circle-outline",
    title: "Order declined",
    subtitle: "The vendor couldn't fulfil this order. Your payment has been refunded.",
  },
  cancelled: {
    bg: COLORS.redSoft,
    color: COLORS.red,
    icon: "close-circle-outline",
    title: "Order cancelled",
    subtitle: "This order was cancelled.",
  },
};

const ActiveOrderTrackingScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const token = useUserStore((state) => state.token);
  const detail = useFetch(() => orderApi.get(token, orderId), [token, orderId]);
  const [busy, setBusy] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState(null);
  const [disputeDetail, setDisputeDetail] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState([]);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const order = detail.data?.order;

  const submitDispute = async () => {
    setSubmittingDispute(true);
    try {
      let evidenceImages = [];

      if (evidencePhotos.length) {
        const uploaded = await uploadApi.images(token, evidencePhotos);
        evidenceImages = uploaded.urls || [];
      }

      await disputeApi.create(token, {
        orderId: order.id,
        reason: disputeReason,
        detail: disputeDetail.trim(),
        evidenceImages,
      });

      setShowDispute(false);
      setDisputeReason(null);
      setDisputeDetail("");
      setEvidencePhotos([]);
      await detail.refresh();
      Alert.alert(
        "Dispute submitted",
        "The payment is now on hold until it's resolved.",
      );
    } catch (error) {
      Alert.alert("Could not submit dispute", error.message);
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (detail.loading || !order) {
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

  const banner = BUYER_BANNERS[order.status] || BUYER_BANNERS.pending;
  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;

  const confirmDelivery = () =>
    Alert.alert(
      "Confirm delivery",
      "Confirming releases your payment to the vendor. Only confirm once you've checked your item.",
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Confirm delivery",
          onPress: async () => {
            setBusy(true);
            try {
              await buyerApi.confirmDelivery(token, order.id);
              await detail.refresh();
            } catch (error) {
              Alert.alert("Could not confirm", error.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ORDER TRACKING</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: banner.bg }]}>
          <Ionicons name={banner.icon} size={20} color={banner.color} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: banner.color }]}>{banner.title}</Text>
            <Text style={styles.bannerSub}>{banner.subtitle}</Text>
          </View>
        </View>

        <View style={styles.productRow}>
          <ProductThumb uri={order.productImageUrl} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{order.productName}</Text>
            <Text style={styles.productMeta}>
              {order.size ? `Size: ${order.size}   ` : ""}Qty: {order.quantity}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text style={styles.amount}>{naira(order.orderAmount)}</Text>
            <StatusPill label={meta.label} color={meta.color} bg={meta.bg} small />
          </View>
        </View>

        {["ready_for_pickup", "shipped", "delivered", "completed"].includes(order.status) ? (
          <View style={styles.stepsWrap}>
            <ProgressSteps status={order.status} />
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order no:</Text>
            <Text style={styles.infoValueBold}>#{order.orderNo}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>Placed</Text>
            <Text style={styles.infoValue}>
              {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>Amount paid (in escrow)</Text>
            <Text style={styles.infoValueBold}>{naira(order.orderAmount)}</Text>
          </View>
          {order.deliveryAddress ? (
            <View style={[styles.infoRow, styles.infoDivider]}>
              <Text style={styles.infoLabel}>Deliver to</Text>
              <Text style={[styles.infoValue, { flex: 1, textAlign: "right" }]} numberOfLines={2}>
                {order.deliveryAddress}
              </Text>
            </View>
          ) : null}
        </View>

        {order.escrowStatus === "held" && !["declined", "cancelled"].includes(order.status) ? (
          <View style={styles.escrowNote}>
            <Ionicons name="lock-closed-outline" size={15} color={COLORS.teal} />
            <Text style={styles.escrowText}>
              Your payment stays in escrow until you confirm delivery — or for 2 hours after
              delivery if no return is initiated.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {order.status === "delivered" ? (
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Initiate return"
              variant="danger-outline"
              style={{ flex: 1 }}
              onPress={() => setShowDispute(true)}
            />
            <PrimaryButton
              label="Confirm delivery"
              style={{ flex: 1 }}
              loading={busy}
              onPress={confirmDelivery}
            />
          </View>
        </View>
      ) : null}

      {/* Raise-a-dispute sheet: reason, what happened, optional photo evidence */}
      <BottomSheet visible={showDispute} onClose={() => setShowDispute(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>What went wrong?</Text>
          <Text style={styles.sheetSub}>
            Your payment stays safely in escrow while we look into it.
          </Text>

          {DISPUTE_REASONS.map((reason) => {
            const selected = disputeReason === reason;

            return (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonRow, selected && styles.reasonRowActive]}
                onPress={() => setDisputeReason(reason)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selected ? COLORS.teal : COLORS.faint}
                />
                <Text style={[styles.reasonText, selected && styles.reasonTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TextInput
            style={styles.detailInput}
            placeholder="Tell us what happened"
            placeholderTextColor={COLORS.faint}
            value={disputeDetail}
            onChangeText={setDisputeDetail}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.evidenceLabel}>EVIDENCE (OPTIONAL)</Text>
          <View style={styles.evidenceRow}>
            {evidencePhotos.map((photo) => (
              <View key={photo.uri}>
                <Image source={{ uri: photo.uri }} style={styles.evidenceThumb} />
                <TouchableOpacity
                  style={styles.evidenceRemove}
                  onPress={() =>
                    setEvidencePhotos((photos) => photos.filter((item) => item.uri !== photo.uri))
                  }
                >
                  <Ionicons name="close" size={12} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
            {evidencePhotos.length < 4 ? (
              <TouchableOpacity
                style={styles.evidenceAdd}
                onPress={() =>
                  pickEvidencePhoto((asset) => setEvidencePhotos((photos) => [...photos, asset]))
                }
              >
                <Ionicons name="camera-outline" size={20} color={COLORS.slate} />
                <Text style={styles.evidenceAddText}>Add photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <PrimaryButton
            label="Submit dispute"
            style={{ marginTop: 18 }}
            loading={submittingDispute}
            disabled={!disputeReason || !disputeDetail.trim()}
            onPress={submitDispute}
          />
        </ScrollView>
      </BottomSheet>
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
  back: { position: "absolute", left: 16 },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.ink,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  banner: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  bannerTitle: { fontSize: 14, fontWeight: "800" },
  bannerSub: { fontSize: 12, color: COLORS.slate, marginTop: 2, lineHeight: 17 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  productName: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  productMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  stepsWrap: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 14,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    gap: 12,
  },
  infoDivider: { borderTopWidth: 1, borderTopColor: COLORS.line },
  infoLabel: { fontSize: 13, color: COLORS.muted },
  infoValue: { fontSize: 13, fontWeight: "600", color: COLORS.ink },
  infoValueBold: { fontSize: 13.5, fontWeight: "800", color: COLORS.ink },
  escrowNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.tealSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  escrowText: { flex: 1, fontSize: 12, color: COLORS.slate, lineHeight: 17 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  footerRow: { flexDirection: "row", gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  sheetSub: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  reasonRowActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  reasonText: { fontSize: 13.5, fontWeight: "600", color: COLORS.slate },
  reasonTextActive: { color: COLORS.ink },
  detailInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 84,
    fontSize: 13.5,
    color: COLORS.ink,
    marginTop: 6,
  },
  evidenceLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.muted,
    marginTop: 14,
    marginBottom: 8,
  },
  evidenceRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  evidenceThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  evidenceRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceAdd: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.faint,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  evidenceAddText: { fontSize: 9, color: COLORS.slate },
});

export default ActiveOrderTrackingScreen;
