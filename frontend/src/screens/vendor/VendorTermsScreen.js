import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import BackCircle from "../../components/kyc/BackCircle";

const SECTIONS = [
  {
    heading: "1. Your vendor account",
    body: "You must be at least 18 and complete identity verification (NIN, ID document and liveness check) before your store can go live on O-Fash Markett. Keep your account details accurate and your login credentials to yourself — you are responsible for activity on your account.",
  },
  {
    heading: "2. Listings",
    body: "List only fashion items you actually have in stock and can deliver. Photos and descriptions must reflect the real item, including its condition (new with tags or thrift), sizes and measurements. Counterfeit or stolen goods are strictly prohibited and lead to immediate removal.",
  },
  {
    heading: "3. Orders and fulfilment",
    body: "Accept an order only if you can fulfil it. Once accepted, package the item promptly and hand it to the assigned rider using your pickup code. Repeated declines, cancellations or late fulfilment can reduce your store's visibility.",
  },
  {
    heading: "4. Escrow payments",
    body: "Buyer payments are held in escrow. Funds are released to your payout account after the buyer confirms delivery, or automatically 2 hours after delivery if the buyer raises no issue. If a dispute is opened before release, the payment is frozen until the dispute is resolved.",
  },
  {
    heading: "5. Commissions and fees",
    body: "O-Fash Markett charges a platform commission on each completed order. The fee is shown on every order before you accept it and is deducted before payout. We may revise commission rates with prior notice in the app.",
  },
  {
    heading: "6. Returns and disputes",
    body: "Buyers can dispute an order that arrives damaged, wrong or materially different from its listing, supported by photo evidence. You may respond with your own evidence. Our resolution team decides based on the evidence, and the escrowed amount is released or refunded accordingly.",
  },
  {
    heading: "7. Prohibited conduct",
    body: "In line with marketplace policy you must not take deals off-platform, share or request contact information to bypass the marketplace, manipulate reviews, list prohibited items, or harass buyers or riders. Off-platform dealing removes escrow protection for everyone and can lead to suspension.",
  },
  {
    heading: "8. Content and store branding",
    body: "You retain ownership of your photos and store content, and you grant O-Fash Markett a licence to display them for marketplace, discovery and promotional purposes. Do not upload content you have no right to use.",
  },
  {
    heading: "9. Suspension and termination",
    body: "We may suspend or close stores that break these terms, fail verification, or present fraud or safety risk. You may close your store at any time; pending orders and held escrow are settled first. To request account and data deletion, contact contact@o-fashmarkett.com.",
  },
  {
    heading: "10. Changes to these terms",
    body: "We may update these terms as the marketplace evolves. Meaningful changes will be announced in the app, and continuing to sell after they take effect means you accept them.",
  },
];

const VendorTermsScreen = ({ navigation }) => (
  <SafeAreaView style={styles.flex} edges={["top"]}>
    <View style={styles.header}>
      <BackCircle onPress={() => navigation.goBack()} style={styles.back} />
      <Text style={styles.headerTitle}>TERMS & CONDITIONS</Text>
    </View>

    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.updated}>O-Fash Markett — Vendor Terms & Conditions</Text>
      {SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
      <Text style={styles.draftNote}>Draft — pending legal review.</Text>
    </ScrollView>
  </SafeAreaView>
);

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
    paddingBottom: 40,
  },
  updated: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 6,
  },
  section: {
    marginTop: 16,
  },
  heading: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 5,
  },
  body: {
    fontSize: 12.5,
    color: COLORS.slate,
    lineHeight: 19,
  },
  draftNote: {
    fontSize: 11.5,
    color: COLORS.muted,
    fontStyle: "italic",
    marginTop: 26,
    textAlign: "center",
  },
});

export default VendorTermsScreen;
