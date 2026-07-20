import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import BackCircle from "../../components/kyc/BackCircle";
import EmptyState from "../../components/vendor/EmptyState";
import { vendorApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import { timeAgo } from "../../utils/format";

const TONE_META = {
  teal: { color: COLORS.teal, bg: COLORS.tealSoft },
  green: { color: COLORS.green, bg: COLORS.greenSoft },
  amber: { color: COLORS.amber, bg: COLORS.amberSoft },
  red: { color: COLORS.red, bg: COLORS.redSoft },
};

const ICON_BY_TYPE = {
  new_order: "cart-outline",
  order_shipped: "cube-outline",
  order_delivered: "checkmark-done-outline",
  payment_released: "cash-outline",
  dispute: "alert-circle-outline",
  low_stock: "archive-outline",
  out_of_stock: "archive-outline",
};

const targetRoute = (item) => {
  if (item.targetType === "order") return ["VendorOrderDetail", { orderId: item.targetId }];
  if (item.targetType === "dispute") return ["VendorDisputeDetail", { disputeId: item.targetId }];
  if (item.targetType === "product") return ["VendorProductDetail", { productId: item.targetId }];
  return null;
};

const NotificationRow = ({ item, divider, onPress }) => {
  const tone = TONE_META[item.tone] || { color: COLORS.slate, bg: COLORS.surface };

  return (
    <TouchableOpacity
      style={[styles.row, divider && styles.rowDivider]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
        <Ionicons
          name={ICON_BY_TYPE[item.type] || "notifications-outline"}
          size={18}
          color={tone.color}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
      </View>
      <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
    </TouchableOpacity>
  );
};

const VendorNotificationsScreen = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const feed = useFetch(() => vendorApi.notifications(token), [token]);
  const items = feed.data?.items || [];

  const open = (item) => {
    const route = targetRoute(item);
    if (route) navigation.navigate(route[0], route[1]);
  };

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <BackCircle onPress={() => navigation.goBack()} style={styles.back} />
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
      </View>

      {feed.loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.teal} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} />
          }
        >
          {feed.error ? (
            <Text style={styles.errorText}>{feed.error.message}</Text>
          ) : items.length === 0 ? (
            <EmptyState
              icon="notifications-outline"
              title="No notifications yet"
              subtitle="Order updates, disputes and stock alerts will show up here."
            />
          ) : (
            <View style={styles.card}>
              {items.map((item, index) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  divider={index > 0}
                  onPress={targetRoute(item) ? () => open(item) : undefined}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  errorText: {
    color: COLORS.slate,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 12,
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.ink,
  },
  rowBody: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  rowTime: {
    fontSize: 10.5,
    color: COLORS.faint,
    alignSelf: "flex-start",
    marginTop: 2,
    textAlign: "right",
  },
});

export default VendorNotificationsScreen;
