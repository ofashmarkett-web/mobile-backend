import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { buyerApi, orderApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import LeafletMap from "../../components/common/LeafletMap";
import { formatDate } from "../../utils/format";

// Free OSM geocoder — same pattern/User-Agent as the vendor location step.
// One-shot per address; a miss returns null (never throws).
const geocodeAddress = async (query) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "o-fash-markett/1.0" } },
    );
    if (!response.ok) return null;
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) return null;
    const hit = results[0];
    const latitude = parseFloat(hit.lat);
    const longitude = parseFloat(hit.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
    return { latitude, longitude };
  } catch (error) {
    return null;
  }
};

// Honest ETA: real timestamps only — no invented rider times.
const etaLine = (order) => {
  if (order.deliveredAt) return `Delivered ${formatDate(order.deliveredAt)}`;
  if (order.pickedUpAt) {
    const twoDays = new Date(new Date(order.pickedUpAt).getTime() + 2 * 24 * 60 * 60 * 1000);
    return `${formatDate(order.pickedUpAt)} - ${formatDate(twoDays)}`;
  }
  return "Awaiting pickup";
};

// Module-scope row for the bottom card (never define components inside components).
const AddressDotRow = ({ color, text }) => (
  <View style={styles.dotRow}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.dotText} numberOfLines={2}>
      {text}
    </Text>
  </View>
);

const TrackOrderScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const token = useUserStore((state) => state.token);
  const detail = useFetch(() => orderApi.get(token, orderId), [token, orderId]);
  const order = detail.data?.order;

  const [pickupCoords, setPickupCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [pickupAddressText, setPickupAddressText] = useState(null);
  const [geocoding, setGeocoding] = useState(true);
  const geocodedRef = useRef(false);

  // Geocode both ends once the order arrives — one shot each. If the order
  // has no pickup address yet, fall back to the vendor's store address.
  useEffect(() => {
    if (!order || geocodedRef.current) return;
    geocodedRef.current = true;

    let alive = true;

    (async () => {
      let pickupAddress = order.pickupAddress;

      if (!pickupAddress && order.vendorId) {
        try {
          const store = await buyerApi.store(token, order.vendorId);
          pickupAddress = store.store?.address || null;
        } catch (error) {
          pickupAddress = null;
        }
      }

      if (alive && pickupAddress) setPickupAddressText(pickupAddress);

      const pickup = pickupAddress ? await geocodeAddress(pickupAddress) : null;
      if (alive && pickup) setPickupCoords(pickup);

      const delivery = order.deliveryAddress
        ? await geocodeAddress(order.deliveryAddress)
        : null;
      if (alive && delivery) setDeliveryCoords(delivery);

      if (alive) setGeocoding(false);
    })();

    return () => {
      alive = false;
    };
  }, [order, token]);

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

  const markers = [];
  if (pickupCoords) {
    markers.push({ ...pickupCoords, label: "Pickup", color: "orange" });
  }
  if (deliveryCoords) {
    markers.push({ ...deliveryCoords, label: "Delivery", color: "teal" });
  }

  return (
    <View style={styles.flex}>
      {/* Full-screen interactive map; markers stream in as geocoding lands. */}
      <LeafletMap
        markers={markers}
        routeBetween
        fit
        height="100%"
        style={styles.map}
      />

      <SafeAreaView style={styles.overlay} edges={["top"]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.closeCircle}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={COLORS.ink} />
        </TouchableOpacity>

        {geocoding ? (
          <View style={styles.geoBadge}>
            <ActivityIndicator color={COLORS.teal} size="small" />
            <Text style={styles.geoBadgeText}>Locating addresses…</Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Bottom card */}
      <SafeAreaView style={styles.bottomWrap} edges={["bottom"]} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.etaLabel}>Estimated Arrival Time</Text>
          <Text style={styles.etaValue}>{etaLine(order)}</Text>

          {/* Rider details are honest: no rider data exists yet. */}
          <View style={styles.riderRow}>
            <View style={styles.riderCircle}>
              <Ionicons name="person-outline" size={18} color={COLORS.muted} />
            </View>
            <Text style={styles.riderText}>
              Rider details appear here once your order is picked up
            </Text>
          </View>

          <View style={styles.divider} />

          {pickupAddressText || order.pickupAddress ? (
            <AddressDotRow color={COLORS.orange} text={pickupAddressText || order.pickupAddress} />
          ) : null}
          {order.deliveryAddress ? (
            <AddressDotRow color={COLORS.teal} text={order.deliveryAddress} />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#E9F1EC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  errorText: { color: COLORS.slate, padding: 24, textAlign: "center" },
  map: { marginTop: 0, borderRadius: 0, borderWidth: 0, ...StyleSheet.absoluteFillObject },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  geoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
    ...SHADOWS.card,
  },
  geoBadgeText: { fontSize: 12, fontWeight: "600", color: COLORS.slate },
  bottomWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    ...SHADOWS.sheet,
  },
  etaLabel: { fontSize: 12, color: COLORS.muted },
  etaValue: { fontSize: 17, fontWeight: "800", color: COLORS.ink, marginTop: 3 },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  riderCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  riderText: { flex: 1, fontSize: 12.5, color: COLORS.muted, lineHeight: 18 },
  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 12 },
  dotRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  dotText: { flex: 1, fontSize: 12.5, color: COLORS.slate, lineHeight: 18 },
});

export default TrackOrderScreen;
