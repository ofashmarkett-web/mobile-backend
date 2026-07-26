import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { buyerApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import { useFetch } from "../../hooks/useFetch";
import Stars from "../../components/vendor/Stars";
import ProductThumb from "../../components/vendor/ProductThumb";
import EmptyState from "../../components/vendor/EmptyState";
import BuyerProductCard from "../../components/buyer/ProductCardGrid";
import { formatDate } from "../../utils/format";

const CARD_WIDTH = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

const STORE_TABS = ["Items", "Reviews", "About"];

const ReviewRow = ({ review }) => (
  <View style={styles.reviewRow}>
    <View style={styles.reviewTop}>
      <Stars rating={review.rating} size={12} />
      <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
    </View>
    {review.comment ? <Text style={styles.reviewComment}>“{review.comment}”</Text> : null}
    <Text style={styles.reviewBuyer}>{review.buyerName}</Text>
  </View>
);

const InfoCard = ({ icon, label, value }) => (
  <View style={styles.infoCard}>
    <Ionicons name={icon} size={18} color={COLORS.teal} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const VendorStorePage = ({ navigation, route }) => {
  const { vendorId } = route.params || {};
  const token = useUserStore((state) => state.token);
  const [tab, setTab] = useState("Items");

  const page = useFetch(() => buyerApi.store(token, vendorId), [token, vendorId]);

  if (page.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.teal} size="large" />
      </View>
    );
  }

  if (page.error) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <TouchableOpacity style={styles.backFloating} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.errorText}>{page.error.message}</Text>
      </SafeAreaView>
    );
  }

  const { store, description = "", stats = {}, reviews = [], products = [] } = page.data || {};

  const sendMessage = () =>
    Alert.alert(
      "Chat",
      "In-app chat arrives with the next milestone — for your protection, keep all communication on O-Fash.",
    );

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={page.refreshing} onRefresh={page.refresh} />}
      >
        <View style={styles.headerBlock}>
          {store?.storeLogoUrl ? (
            <ProductThumb uri={store.storeLogoUrl} size={72} radius={36} />
          ) : (
            <View style={styles.logoFallback}>
              <MaterialCommunityIcons name="storefront-outline" size={32} color={COLORS.red} />
            </View>
          )}
          <Text style={styles.businessName}>{store?.businessName}</Text>
          <Text style={styles.handleLine}>
            @{store?.storeHandle}
            {(store?.categories || [])[0] ? ` • ${store.categories[0]}` : ""}
          </Text>
          <View style={styles.ratingRow}>
            <Stars rating={stats.rating || 0} size={13} />
            <Text style={styles.ratingText}>
              {stats.ratingCount > 0
                ? `${stats.rating} (${stats.ratingCount} rating${stats.ratingCount === 1 ? "" : "s"})`
                : "No ratings yet"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.productCount ?? 0}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.unitsSold ?? 0}</Text>
            <Text style={styles.statLabel}>Sold</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {stats.ratingCount > 0 ? stats.rating : "—"}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.messageButton} onPress={sendMessage} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.white} />
          <Text style={styles.messageText}>Send a message</Text>
        </TouchableOpacity>

        <View style={styles.tabRow}>
          {STORE_TABS.map((name) => {
            const active = tab === name;
            return (
              <TouchableOpacity
                key={name}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setTab(name)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === "Items" ? (
          products.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              title="No items in stock"
              subtitle="This store has no live listings right now."
            />
          ) : (
            <View style={styles.grid}>
              {products.map((item) => (
                <BuyerProductCard
                  key={item.id}
                  item={item}
                  width={CARD_WIDTH}
                  onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
                />
              ))}
            </View>
          )
        ) : null}

        {tab === "Reviews" ? (
          reviews.length === 0 ? (
            <EmptyState
              icon="star-outline"
              title="No reviews yet"
              subtitle="Reviews from verified buyers will show up here."
            />
          ) : (
            reviews.map((review) => <ReviewRow key={review.id} review={review} />)
          )
        ) : null}

        {tab === "About" ? (
          <View>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : (
              <Text style={styles.descriptionEmpty}>
                This vendor has not added a store description yet.
              </Text>
            )}
            {/* Response time needs chat data, which arrives with the chat
                milestone — shown honestly as "—" until then. */}
            <InfoCard icon="time-outline" label="Response Time" value="—" />
            <InfoCard
              icon="checkmark-done-outline"
              label="Completion Rate"
              value={stats.completionRate != null ? `${stats.completionRate}%` : "—"}
            />
            {store?.cacVerified ? (
              <View style={styles.cacCard}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.green} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cacTitle}>CAC Verified</Text>
                  <Text style={styles.cacSubtitle}>
                    This business is registered with the Corporate Affairs Commission.
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.joinedLine}>
              On O-Fash since {formatDate(stats.joinedAt)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  errorText: { color: COLORS.slate, padding: 24, textAlign: "center" },
  backFloating: {
    position: "absolute",
    top: 12,
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  headerBlock: {
    alignItems: "center",
    marginTop: 4,
  },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  businessName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 10,
    textAlign: "center",
  },
  handleLine: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.slate,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.ink,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.teal,
    marginTop: 14,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.white,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    marginBottom: 14,
  },
  tabPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  tabPillActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.slate,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  reviewRow: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewDate: {
    fontSize: 10.5,
    color: COLORS.muted,
  },
  reviewComment: {
    fontSize: 12.5,
    color: COLORS.slate,
    lineHeight: 18,
    marginTop: 6,
  },
  reviewBuyer: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.ink,
    marginTop: 6,
  },
  description: {
    fontSize: 13,
    color: COLORS.slate,
    lineHeight: 20,
    marginBottom: 14,
  },
  descriptionEmpty: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginBottom: 14,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
    marginTop: 2,
  },
  cacCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.greenSoft,
    backgroundColor: COLORS.greenSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cacTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.green,
  },
  cacSubtitle: {
    fontSize: 11.5,
    color: COLORS.slate,
    marginTop: 2,
  },
  joinedLine: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 6,
    textAlign: "center",
  },
});

export default VendorStorePage;
