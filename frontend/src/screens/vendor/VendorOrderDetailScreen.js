import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { orderApi, vendorApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import ProductThumb from "../../components/vendor/ProductThumb";
import StatusPill from "../../components/vendor/StatusPill";
import ProgressSteps from "../../components/vendor/ProgressSteps";
import BottomSheet from "../../components/vendor/BottomSheet";
import PrimaryButton from "../../components/vendor/PrimaryButton";
import {
  formatDate,
  formatTime,
  initials,
  naira,
  ORDER_STATUS_META,
} from "../../utils/format";

const BANNERS = {
  pending: {
    bg: COLORS.amberSoft,
    color: COLORS.amber,
    icon: "document-text-outline",
    title: "Awaiting Your Confirmation",
    subtitle: "Review and accept this order to get things moving.",
  },
  packaging: {
    bg: COLORS.blueSoft,
    color: COLORS.blue,
    icon: "checkmark-circle-outline",
    title: "Order Confirmed",
    subtitle: "Prepare the item for rider pickup.",
  },
  ready_for_pickup: {
    bg: COLORS.tealSoft,
    color: COLORS.teal,
    icon: "bicycle-outline",
    title: "Finding a rider near you...",
    subtitle: "We are matching you with the nearest available rider.",
  },
  shipped: {
    bg: COLORS.orangeSoft,
    color: COLORS.orange,
    icon: "bicycle-outline",
    title: "Rider In Transit",
    subtitle: "Your item is on its way to the buyer.",
  },
  delivered: {
    bg: COLORS.greenSoft,
    color: COLORS.green,
    icon: "cube-outline",
    title: "Delivered - Awaiting Confirmation",
    subtitle: "Buyer has 2 hours to confirm or raise a dispute.",
  },
  completed: {
    bg: COLORS.greenSoft,
    color: COLORS.green,
    icon: "checkmark-done-outline",
    title: "Order Completed",
    subtitle: "Payment has been released to your account.",
  },
  declined: {
    bg: COLORS.redSoft,
    color: COLORS.red,
    icon: "close-circle-outline",
    title: "Order Declined",
    subtitle: "The buyer's payment has been refunded.",
  },
  cancelled: {
    bg: COLORS.redSoft,
    color: COLORS.red,
    icon: "close-circle-outline",
    title: "Order Cancelled",
    subtitle: "This order was cancelled.",
  },
};

const CHECKLIST = (orderNo) => [
  {
    key: "packed",
    title: "Item is packed and secure",
    subtitle: "Wrap carefully to avoid damage in transit",
  },
  {
    key: "noted",
    title: "Order ID is noted",
    subtitle: `Reference no: ${orderNo}`,
  },
  {
    key: "present",
    title: "I'll be here when the rider arrives",
    subtitle: "Riders may call ahead before pickup",
  },
];

// Pickup-address sheets (module scope — defining these inside the screen would
// remount the TextInput on every keystroke and close the keyboard).

const PickupSheetHeader = ({ title, subtitle }) => (
  <>
    <View style={styles.pickupIconWrap}>
      <Ionicons name="navigate" size={28} color={COLORS.teal} />
    </View>
    <Text style={styles.pickupSheetTitle}>{title}</Text>
    <Text style={styles.pickupSheetSub}>{subtitle}</Text>
  </>
);

// Sheet A — confirm the pickup address before the rider is notified.
const PickupAddressSheet = ({ address, busy, onProceed, onChangeAddress }) => (
  <>
    <PickupSheetHeader
      title="Pickup address"
      subtitle="Confirm this before we notify the rider."
    />
    <View style={styles.pickupAddressRow}>
      <Ionicons name="navigate-outline" size={16} color={COLORS.teal} />
      <Text style={styles.pickupAddressText}>{address || "No pickup address set yet"}</Text>
    </View>
    <PrimaryButton label="Proceed" loading={busy} disabled={!address} onPress={onProceed} />
    <PrimaryButton
      label="Change pickup address"
      variant="outline"
      style={{ marginTop: 10 }}
      onPress={onChangeAddress}
    />
  </>
);

// Sheet B — enter a different pickup address for this order.
const ChangePickupAddressSheet = ({ draft, onDraftChange, onBack, onSave }) => (
  <>
    <PickupSheetHeader
      title="Change pickup address"
      subtitle="Where should the rider come to pick up this order?"
    />
    <View style={styles.pickupDashedBox}>
      <View style={styles.pickupFieldBox}>
        <Text style={styles.pickupFieldLabel}>PICKUP ADDRESS</Text>
        <TextInput
          style={styles.pickupFieldInput}
          value={draft}
          onChangeText={onDraftChange}
          placeholder="Enter your new pickup address"
          placeholderTextColor={COLORS.muted}
          multiline
        />
      </View>
    </View>
    <View style={styles.footerRow}>
      <PrimaryButton label="Go back" variant="outline" style={{ flex: 1 }} onPress={onBack} />
      <PrimaryButton
        label="Save address"
        style={{ flex: 1 }}
        disabled={!draft.trim()}
        onPress={onSave}
      />
    </View>
  </>
);

// Live countdown to escrow auto-release (mockup: "05 : 27 hrs mins").
const useCountdown = (target) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!target) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [target]);

  if (!target) return null;

  const remaining = Math.max(0, new Date(target).getTime() - now);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);

  return { hours: `${hours}`.padStart(2, "0"), minutes: `${minutes}`.padStart(2, "0"), done: remaining === 0 };
};

const VendorOrderDetailScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const token = useUserStore((state) => state.token);
  const detail = useFetch(() => orderApi.get(token, orderId), [token, orderId]);
  const order = detail.data?.order;

  const [busy, setBusy] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checked, setChecked] = useState({});
  const [showRiderSheet, setShowRiderSheet] = useState(false);
  // null | "confirm" (Sheet A) | "edit" (Sheet B)
  const [addressSheet, setAddressSheet] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const countdown = useCountdown(order?.status === "delivered" ? order.autoReleaseAt : null);

  // Fetch the store address once — it's the default pickup point when the
  // order has no per-order pickup address yet.
  useEffect(() => {
    let active = true;
    vendorApi
      .store(token)
      .then((result) => {
        if (active) setStoreAddress(result.store?.address || "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (countdown?.done) detail.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown?.done]);

  const act = async (action, after) => {
    setBusy(true);
    try {
      await action();
      await detail.refresh();
      after?.();
    } catch (error) {
      Alert.alert("Something went wrong", error.message);
    } finally {
      setBusy(false);
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

  const banner = BANNERS[order.status] || BANNERS.pending;
  const currentPickupAddress = pickupAddress || order.pickupAddress || storeAddress;
  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
  const allChecked = CHECKLIST(order.orderNo).every((item) => checked[item.key]);
  const showSteps = ["ready_for_pickup", "shipped", "delivered", "completed"].includes(
    order.status,
  );

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ORDER DETAILS</Text>
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

        {showSteps ? (
          <View style={styles.stepsWrap}>
            <ProgressSteps status={order.status} />
          </View>
        ) : null}

        <View style={styles.buyerRow}>
          <View style={styles.buyerAvatar}>
            <Text style={styles.buyerInitials}>{initials(order.buyerName)}</Text>
          </View>
          <Text style={styles.buyerName}>{order.buyerName}</Text>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() =>
              Alert.alert(
                "Order chat",
                "Order-linked chat is the next milestone on the roadmap — it will open right here.",
              )
            }
          >
            <Text style={styles.messageText}>Message</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order no:</Text>
            <Text style={styles.infoValueBold}>#{order.orderNo}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <View style={styles.infoIconLabel}>
              <Ionicons name="calendar-clear-outline" size={15} color={COLORS.muted} />
              <Text style={styles.infoLabel}>Date</Text>
            </View>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <View style={styles.infoIconLabel}>
              <Ionicons name="time-outline" size={15} color={COLORS.muted} />
              <Text style={styles.infoLabel}>Time</Text>
            </View>
            <Text style={styles.infoValue}>{formatTime(order.createdAt)}</Text>
          </View>

          <View style={[styles.infoDivider, { paddingTop: 12 }]}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order amount</Text>
              <Text style={styles.infoValue}>{naira(order.orderAmount)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform fee ({order.platformFeePct}%)</Text>
              <Text style={styles.infoValue}>-{naira(order.platformFee)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoValueBold}>
                {order.escrowStatus === "released" ? "You received" : "You will receive"}
              </Text>
              <Text style={styles.receiveAmount}>{naira(order.vendorReceives)}</Text>
            </View>
          </View>
        </View>

        {order.status === "delivered" && countdown ? (
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>Payment Auto-Release Countdown</Text>
            <View style={styles.countdownRow}>
              <Text style={styles.countdownValue}>{countdown.hours}</Text>
              <Text style={styles.countdownColon}>:</Text>
              <Text style={styles.countdownValue}>{countdown.minutes}</Text>
            </View>
            <View style={styles.countdownUnits}>
              <Text style={styles.countdownUnit}>hrs</Text>
              <Text style={styles.countdownUnit}>mins</Text>
            </View>
          </View>
        ) : null}

        {order.escrowStatus === "held" &&
        ["packaging", "ready_for_pickup", "shipped"].includes(order.status) ? (
          <View style={styles.escrowNote}>
            <Ionicons name="lock-closed-outline" size={15} color={COLORS.teal} />
            <Text style={styles.escrowText}>
              Payment will be held in escrow until the buyer confirms delivery.
            </Text>
          </View>
        ) : null}

        {order.deliveryAddress ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>Delivery address</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.teal} />
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {order.status === "pending" ? (
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Decline"
              variant="danger-outline"
              style={{ flex: 1 }}
              loading={busy}
              onPress={() =>
                Alert.alert("Decline this order?", "The buyer's payment will be refunded.", [
                  { text: "Keep order", style: "cancel" },
                  {
                    text: "Decline",
                    style: "destructive",
                    onPress: () => act(() => orderApi.decline(token, order.id)),
                  },
                ])
              }
            />
            <PrimaryButton
              label="Accept"
              style={{ flex: 1 }}
              loading={busy}
              onPress={() => act(() => orderApi.accept(token, order.id))}
            />
          </View>
        ) : null}

        {order.status === "packaging" ? (
          <PrimaryButton label="Item is packed" onPress={() => setShowChecklist(true)} />
        ) : null}

        {order.status === "ready_for_pickup" ? (
          <PrimaryButton label="View pickup code" onPress={() => setShowRiderSheet(true)} />
        ) : null}

        {order.status === "shipped" ? (
          <PrimaryButton
            label="Track order"
            onPress={() =>
              Alert.alert(
                "Live tracking",
                "Rider live-location tracking arrives with the delivery milestone.",
              )
            }
          />
        ) : null}
      </View>

      {/* "Is the item ready?" checklist */}
      <BottomSheet visible={showChecklist} onClose={() => setShowChecklist(false)}>
        <View style={styles.sheetIconWrap}>
          <MaterialCommunityIcons name="package-variant-closed" size={26} color={COLORS.gold} />
        </View>
        <Text style={styles.sheetTitle}>Is the item ready?</Text>
        <Text style={styles.sheetSub}>
          Check the boxes to confirm these before notifying the rider.
        </Text>

        {CHECKLIST(order.orderNo).map((item) => {
          const on = checked[item.key];

          return (
            <TouchableOpacity
              key={item.key}
              style={styles.checkRow}
              onPress={() => setChecked((state) => ({ ...state, [item.key]: !on }))}
              activeOpacity={0.8}
            >
              <Ionicons
                name={on ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={on ? COLORS.amber : COLORS.faint}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>{item.title}</Text>
                <Text style={styles.checkSub}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.footerRow, { marginTop: 16 }]}>
          <PrimaryButton
            label="Not yet"
            variant="danger-outline"
            style={{ flex: 1 }}
            onPress={() => setShowChecklist(false)}
          />
          <PrimaryButton
            label="Ready for pickup"
            style={{ flex: 1 }}
            disabled={!allChecked}
            onPress={() => {
              // The rider is only notified after the vendor confirms the
              // pickup address on the next sheet.
              setShowChecklist(false);
              setAddressSheet("confirm");
            }}
          />
        </View>
      </BottomSheet>

      {/* Pickup address confirmation (Sheet A) / change (Sheet B) */}
      <BottomSheet visible={addressSheet !== null} onClose={() => setAddressSheet(null)}>
        {addressSheet === "edit" ? (
          <ChangePickupAddressSheet
            draft={draftAddress}
            onDraftChange={setDraftAddress}
            onBack={() => setAddressSheet("confirm")}
            onSave={() => {
              setPickupAddress(draftAddress.trim());
              setAddressSheet("confirm");
            }}
          />
        ) : (
          <PickupAddressSheet
            address={currentPickupAddress}
            busy={busy}
            onProceed={() =>
              act(
                () => orderApi.ready(token, order.id, { pickupAddress: currentPickupAddress }),
                () => {
                  setAddressSheet(null);
                  setShowRiderSheet(true);
                },
              )
            }
            onChangeAddress={() => {
              setDraftAddress("");
              setAddressSheet("edit");
            }}
          />
        )}
      </BottomSheet>

      {/* Finding a rider + pickup code */}
      <BottomSheet visible={showRiderSheet} onClose={() => setShowRiderSheet(false)}>
        <View style={styles.riderIconWrap}>
          <MaterialCommunityIcons name="moped-outline" size={40} color={COLORS.green} />
        </View>
        <Text style={[styles.sheetTitle, { textAlign: "center" }]}>Finding a rider near you...</Text>
        <Text style={[styles.sheetSub, { textAlign: "center" }]}>
          We are matching you with the nearest available rider. This usually takes 2-5 minutes.
        </Text>

        <Text style={styles.codeLabel}>YOUR PICKUP CODE</Text>
        <Text style={styles.codeValue}>{order.pickupCode || "—"}</Text>
        <Text style={styles.codeHint}>Share with rider when they arrive to collect</Text>

        <PrimaryButton
          label="Cancel - item not ready yet"
          variant="danger-outline"
          loading={busy}
          style={{ marginTop: 20 }}
          onPress={() =>
            act(
              () => orderApi.cancelReady(token, order.id),
              () => setShowRiderSheet(false),
            )
          }
        />
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  banner: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  bannerSub: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 2,
    lineHeight: 17,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
  },
  productMeta: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
  },
  stepsWrap: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 14,
  },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  buyerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  buyerInitials: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.orange,
  },
  buyerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  messageButton: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  messageText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  infoDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  infoIconLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: "600",
  },
  infoValueBold: {
    fontSize: 13.5,
    color: COLORS.ink,
    fontWeight: "800",
  },
  breakdownTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.ink,
    marginBottom: 2,
  },
  receiveAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.ink,
  },
  countdownCard: {
    backgroundColor: COLORS.tealSoft,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  countdownLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.tealDark,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  countdownValue: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.ink,
    width: 56,
    textAlign: "center",
  },
  countdownColon: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.ink,
  },
  countdownUnits: {
    flexDirection: "row",
    gap: 64,
  },
  countdownUnit: {
    fontSize: 11,
    color: COLORS.muted,
  },
  escrowNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.tealSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  escrowText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.slate,
    lineHeight: 17,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  addressLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.ink,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: COLORS.white,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
  },
  sheetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
  },
  sheetSub: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  checkTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  checkSub: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  pickupIconWrap: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pickupSheetTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
  },
  pickupSheetSub: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
  },
  pickupAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  pickupAddressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.ink,
    lineHeight: 18,
  },
  pickupDashedBox: {
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  pickupFieldBox: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  pickupFieldLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  pickupFieldInput: {
    fontSize: 13.5,
    color: COLORS.ink,
    paddingVertical: 4,
    paddingHorizontal: 0,
    minHeight: 52,
    textAlignVertical: "top",
  },
  riderIconWrap: {
    alignSelf: "center",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: COLORS.greenSoft,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
  },
  codeValue: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.gold,
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 4,
  },
  codeHint: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 4,
  },
});

export default VendorOrderDetailScreen;
