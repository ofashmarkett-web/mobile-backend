import React, { useEffect, useRef, useState } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../theme/colors";
import {
  buyerApi,
  disputeApi,
  orderApi,
  reviewApi,
  uploadApi,
} from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import ProductThumb from "../../components/vendor/ProductThumb";
import StatusPill from "../../components/vendor/StatusPill";
import PrimaryButton from "../../components/vendor/PrimaryButton";
import BottomSheet from "../../components/vendor/BottomSheet";
import { formatDate, formatTime, naira, ORDER_STATUS_META } from "../../utils/format";

// Mockup chips → backend dispute reasons.
const RETURN_REASONS = [
  { label: "Item damaged", value: "Item damaged" },
  { label: "Wrong item", value: "Wrong item" },
  { label: "Not as described", value: "Not as described" },
  { label: "Wrong size", value: "Size / fit issue" },
  { label: "Other reasons", value: "Other" },
];

// Same camera/gallery picker pattern as vendor onboarding & AddListingScreen.
const pickEvidencePhoto = async (onPicked) => {
  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Allow camera access to photograph the item.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled) onPicked(result.assets[0]);
  };

  const fromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow photo access to attach a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) onPicked(result.assets[0]);
  };

  Alert.alert("Add a photo", "Clear photos of the item help.", [
    { text: "Take photo", onPress: fromCamera },
    { text: "Choose from gallery", onPress: fromGallery },
    { text: "Cancel", style: "cancel" },
  ]);
};

// Honest stub — video capture lands with a later milestone.
const videoComingSoon = () =>
  Alert.alert("Video", "Video evidence is coming soon — photos work now.");

// ——— Module-scope pieces (never define components inside components) ———

// Rounded state banner per mockup. Declined/cancelled keep their previous copy.
const StateBanner = ({ order }) => {
  if (["pending", "packaging", "ready_for_pickup"].includes(order.status)) {
    return (
      <View style={[styles.banner, { backgroundColor: COLORS.amberSoft }]}>
        <Ionicons name="hourglass-outline" size={20} color={COLORS.amber} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: COLORS.amber }]}>Order processing</Text>
          <Text style={styles.bannerSub}>
            The vendor is getting your item ready. We'll update you as things move.
          </Text>
        </View>
      </View>
    );
  }

  if (order.status === "shipped") {
    return (
      <View style={[styles.banner, { backgroundColor: COLORS.redSoft }]}>
        <MaterialCommunityIcons name="moped" size={20} color={COLORS.red} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: COLORS.red }]}>Rider In Transit</Text>
          <Text style={styles.bannerSub}>Your item is on its way to you.</Text>
        </View>
      </View>
    );
  }

  if (["delivered", "completed"].includes(order.status)) {
    return (
      <View style={[styles.banner, { backgroundColor: COLORS.greenSoft }]}>
        <Ionicons
          name="checkmark-circle-outline"
          size={20}
          color={COLORS.green}
          style={{ marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: COLORS.green }]}>
            Delivered on {formatDate(order.deliveredAt)}
          </Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Proof of delivery",
                "Proof of delivery photos arrive with the rider app milestone.",
              )
            }
            hitSlop={6}
          >
            <Text style={styles.bannerLink}>View proof of delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (["declined", "cancelled"].includes(order.status)) {
    const declined = order.status === "declined";

    return (
      <View style={[styles.banner, { backgroundColor: COLORS.redSoft }]}>
        <Ionicons name="close-circle-outline" size={20} color={COLORS.red} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: COLORS.red }]}>
            {declined ? "Order declined" : "Order cancelled"}
          </Text>
          <Text style={styles.bannerSub}>
            {declined
              ? "The vendor couldn't fulfil this order. Your payment has been refunded."
              : "This order was cancelled."}
          </Text>
        </View>
      </View>
    );
  }

  return null;
};

// Dashed upload tile used by both the return and review sheets.
const UploadTile = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.uploadTile} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name={icon} size={22} color={COLORS.slate} />
    <Text style={styles.uploadTileText}>{label}</Text>
  </TouchableOpacity>
);

const PhotoThumbRow = ({ photos, onRemove }) => {
  if (!photos.length) return null;

  return (
    <View style={styles.thumbRow}>
      {photos.map((photo) => (
        <View key={photo.uri}>
          <Image source={{ uri: photo.uri }} style={styles.thumb} />
          <TouchableOpacity style={styles.thumbRemove} onPress={() => onRemove(photo)}>
            <Ionicons name="close" size={12} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const SheetItemRow = ({ order }) => (
  <View style={styles.sheetItemRow}>
    <ProductThumb uri={order.productImageUrl} size={44} />
    <View style={{ flex: 1 }}>
      <Text style={styles.productName} numberOfLines={1}>
        {order.productName}
      </Text>
      <Text style={styles.productMeta}>
        {order.size ? `Size: ${order.size}   ` : ""}Qty: {order.quantity}
      </Text>
    </View>
    <Text style={styles.amount}>{naira(order.orderAmount)}</Text>
  </View>
);

const ActiveOrderTrackingScreen = ({ navigation, route }) => {
  const { orderId, openReview } = route.params;
  const token = useUserStore((state) => state.token);
  const detail = useFetch(() => orderApi.get(token, orderId), [token, orderId]);
  const reviewed = useFetch(() => reviewApi.mine(token), [token]);
  const order = detail.data?.order;

  const [busy, setBusy] = useState(false);

  // Return-item sheet state
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState(null); // backend value
  const [otherText, setOtherText] = useState("");
  const [returnPhotos, setReturnPhotos] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Leave-review sheet state
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Address edit sheet state
  const [showAddress, setShowAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const isReviewed = (reviewed.data?.orderIds || []).includes(orderId);

  // Arriving from "Ready for review" opens the review sheet directly.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (
      openReview &&
      !autoOpenedRef.current &&
      order?.status === "completed" &&
      reviewed.data &&
      !isReviewed
    ) {
      autoOpenedRef.current = true;
      setShowReview(true);
    }
  }, [openReview, order?.status, reviewed.data, isReviewed]);

  const submitReturn = async () => {
    setSubmittingReturn(true);
    try {
      let evidenceImages = [];

      if (returnPhotos.length) {
        const uploaded = await uploadApi.images(token, returnPhotos);
        evidenceImages = uploaded.urls || [];
      }

      const reasonLabel =
        RETURN_REASONS.find((item) => item.value === returnReason)?.label || returnReason;

      await disputeApi.create(token, {
        orderId: order.id,
        reason: returnReason,
        // Backend requires a detail line; for non-Other reasons the chip
        // itself is the buyer's stated reason.
        detail: returnReason === "Other" ? otherText.trim() : reasonLabel,
        evidenceImages,
      });

      setShowReturn(false);
      setReturnReason(null);
      setOtherText("");
      setReturnPhotos([]);
      await detail.refresh();
      Alert.alert("Dispute submitted", "The payment is now on hold until it's resolved.");
    } catch (error) {
      Alert.alert("Could not submit return", error.message);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      let images = [];

      if (reviewPhotos.length) {
        const uploaded = await uploadApi.images(token, reviewPhotos);
        images = uploaded.urls || [];
      }

      await reviewApi.create(token, {
        orderId: order.id,
        rating,
        comment: reviewText.trim(),
        images,
      });

      setShowReview(false);
      setRating(0);
      setReviewText("");
      setReviewPhotos([]);
      await Promise.all([detail.refresh(), reviewed.refresh()]);
      Alert.alert("Thanks!", "Your review helps other buyers.");
    } catch (error) {
      Alert.alert("Could not submit review", error.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const saveAddress = async () => {
    setSavingAddress(true);
    try {
      await orderApi.updateAddress(token, order.id, { deliveryAddress: addressDraft.trim() });
      setShowAddress(false);
      await detail.refresh();
    } catch (error) {
      Alert.alert("Could not update address", error.message);
    } finally {
      setSavingAddress(false);
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

  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
  const canEditAddress = ["pending", "packaging"].includes(order.status);

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

  const submitReturnDisabled =
    !returnReason || (returnReason === "Other" && !otherText.trim());

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      {/* Header: Order ID + Receipt (left), teal close circle (top-right) */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.orderIdLabel}>Order ID:</Text>
          <Text style={styles.orderIdValue}>#{order.orderNo}</Text>
        </View>
        <TouchableOpacity
          style={styles.receiptBtn}
          onPress={() =>
            Alert.alert("Receipt", "Receipts arrive with the payments milestone.")
          }
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={13} color={COLORS.teal} />
          <Text style={styles.receiptText}>Receipt</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.closeCircle}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StateBanner order={order} />

        {/* Items */}
        <Text style={styles.sectionLabel}>
          {order.quantity} item{order.quantity === 1 ? "" : "s"}
        </Text>
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

        {/* Delivery address */}
        {order.deliveryAddress ? (
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressTitle}>Delivered to {order.buyerName}</Text>
              {canEditAddress ? (
                <TouchableOpacity
                  onPress={() => {
                    setAddressDraft(order.deliveryAddress || "");
                    setShowAddress(true);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="pencil-outline" size={16} color={COLORS.teal} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={15} color={COLORS.muted} />
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
            </View>
          </View>
        ) : null}

        {/* Date/time + payment breakdown */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Placed</Text>
            <Text style={styles.infoValue}>
              {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>
              {order.quantity} × {order.productName}
            </Text>
            <Text style={styles.infoValue}>{naira(order.unitPrice)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>Amount paid (in escrow)</Text>
            <Text style={styles.infoValueBold}>{naira(order.orderAmount)}</Text>
          </View>
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

      {/* Footer actions by state */}
      {order.status === "shipped" ? (
        <View style={styles.footer}>
          <PrimaryButton
            label="Track order"
            onPress={() => navigation.navigate("TrackOrder", { orderId: order.id })}
          />
        </View>
      ) : null}

      {order.status === "delivered" ? (
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Return item"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => setShowReturn(true)}
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

      {order.status === "completed" && reviewed.data && !isReviewed ? (
        <View style={styles.footer}>
          <PrimaryButton label="Leave review" onPress={() => setShowReview(true)} />
        </View>
      ) : null}

      {/* RETURN ITEM sheet */}
      <BottomSheet visible={showReturn} onClose={() => setShowReturn(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>Return item</Text>

          <SheetItemRow order={order} />

          <Text style={styles.sheetLabel}>EVIDENCE</Text>
          <Text style={styles.sheetHint}>Upload a photo or video of the item</Text>
          <View style={styles.tileRow}>
            <UploadTile
              icon="camera-outline"
              label="Photo"
              onPress={() =>
                pickEvidencePhoto((asset) => setReturnPhotos((photos) => [...photos, asset]))
              }
            />
            <UploadTile icon="videocam-outline" label="Video" onPress={videoComingSoon} />
          </View>
          <PhotoThumbRow
            photos={returnPhotos}
            onRemove={(photo) =>
              setReturnPhotos((photos) => photos.filter((item) => item.uri !== photo.uri))
            }
          />

          <Text style={styles.sheetLabel}>REASON FOR RETURN</Text>
          <View style={styles.chipGrid}>
            {RETURN_REASONS.map((reason) => {
              const selected = returnReason === reason.value;

              return (
                <TouchableOpacity
                  key={reason.value}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => setReturnReason(reason.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {returnReason === "Other" ? (
            <TextInput
              style={styles.detailInput}
              placeholder="Write your reason for the item return"
              placeholderTextColor={COLORS.faint}
              value={otherText}
              onChangeText={setOtherText}
              multiline
              textAlignVertical="top"
            />
          ) : null}

          <PrimaryButton
            label="Submit"
            style={{ marginTop: 18 }}
            loading={submittingReturn}
            disabled={submitReturnDisabled}
            onPress={submitReturn}
          />
        </ScrollView>
      </BottomSheet>

      {/* LEAVE REVIEW sheet */}
      <BottomSheet visible={showReview} onClose={() => setShowReview(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>Leave review</Text>

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} hitSlop={6}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={36}
                  color={COLORS.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          <SheetItemRow order={order} />

          <Text style={styles.sheetLabel}>ADD PHOTOS OR VIDEO</Text>
          <View style={styles.tileRow}>
            <UploadTile
              icon="camera-outline"
              label="Photo"
              onPress={() => {
                if (reviewPhotos.length >= 3) {
                  Alert.alert("Photo limit", "You can attach up to 3 photos.");
                  return;
                }
                pickEvidencePhoto((asset) => setReviewPhotos((photos) => [...photos, asset]));
              }}
            />
            <UploadTile icon="videocam-outline" label="Video" onPress={videoComingSoon} />
          </View>
          <PhotoThumbRow
            photos={reviewPhotos}
            onRemove={(photo) =>
              setReviewPhotos((photos) => photos.filter((item) => item.uri !== photo.uri))
            }
          />

          <Text style={styles.sheetLabel}>WRITE A REVIEW</Text>
          <TextInput
            style={styles.detailInput}
            placeholder="Share your thoughts and experience about the item"
            placeholderTextColor={COLORS.faint}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            textAlignVertical="top"
          />

          <PrimaryButton
            label="Submit review"
            style={{ marginTop: 18 }}
            loading={submittingReview}
            disabled={rating < 1}
            onPress={submitReview}
          />
        </ScrollView>
      </BottomSheet>

      {/* Edit delivery address sheet */}
      <BottomSheet visible={showAddress} onClose={() => setShowAddress(false)}>
        <Text style={styles.sheetTitle}>Delivery address</Text>
        <Text style={styles.sheetHint}>
          You can change the address while the vendor is still preparing your order.
        </Text>
        <TextInput
          style={styles.detailInput}
          placeholder="Delivery address"
          placeholderTextColor={COLORS.faint}
          value={addressDraft}
          onChangeText={setAddressDraft}
          multiline
          textAlignVertical="top"
        />
        <PrimaryButton
          label="Save"
          style={{ marginTop: 18 }}
          loading={savingAddress}
          disabled={!addressDraft.trim()}
          onPress={saveAddress}
        />
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  errorText: { color: COLORS.slate, padding: 24, textAlign: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orderIdLabel: { fontSize: 12, color: COLORS.muted },
  orderIdValue: { fontSize: 15, fontWeight: "800", color: COLORS.ink, marginTop: 1 },
  receiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  receiptText: { fontSize: 12, fontWeight: "700", color: COLORS.teal },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
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
  bannerLink: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.teal,
    textDecorationLine: "underline",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    marginBottom: 6,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  productName: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  productMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  addressCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addressTitle: { fontSize: 13.5, fontWeight: "800", color: COLORS.ink },
  addressRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 12.5, color: COLORS.slate, lineHeight: 18 },
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
  infoLabel: { fontSize: 13, color: COLORS.muted, flexShrink: 1 },
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
  sheetTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink, marginBottom: 10 },
  sheetItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 4,
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.muted,
    marginTop: 14,
    marginBottom: 6,
  },
  sheetHint: { fontSize: 12.5, color: COLORS.muted, marginBottom: 8, lineHeight: 18 },
  tileRow: { flexDirection: "row", gap: 10 },
  uploadTile: {
    flex: 1,
    height: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.faint,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  uploadTileText: { fontSize: 11, fontWeight: "600", color: COLORS.slate },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: COLORS.surface },
  thumbRemove: {
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
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: { borderColor: COLORS.teal, backgroundColor: COLORS.tealSoft },
  chipText: { fontSize: 12.5, fontWeight: "600", color: COLORS.slate },
  chipTextActive: { color: COLORS.teal, fontWeight: "700" },
  detailInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 84,
    fontSize: 13.5,
    color: COLORS.ink,
    marginTop: 10,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
});

export default ActiveOrderTrackingScreen;
