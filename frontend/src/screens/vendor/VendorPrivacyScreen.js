import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import BackCircle from "../../components/kyc/BackCircle";

const SECTIONS = [
  {
    heading: "1. Who we are",
    body: "O-Fash Markett is a fashion marketplace that connects independent vendors with buyers across Nigeria. This policy explains what information we collect from you as a vendor, why we collect it, and how we protect it.",
  },
  {
    heading: "2. Identity and KYC data",
    body: "To keep the marketplace safe, every vendor completes identity verification before their store goes live. This includes your NIN, a government-issued ID document, and a selfie for a liveness check. These are processed through our verification provider solely to confirm your identity. We store the outcome of each check and a reference — not your raw NIN record.",
  },
  {
    heading: "3. What we store",
    body: "We keep the information you give us to run your store: your name, email and phone number, store details (name, description, logo, banner, categories, CAC number where provided), your listings and their photos, your orders and their status history, and your payout account details.",
  },
  {
    heading: "4. Location for vendor discovery",
    body: "Your store address and approximate location are used so nearby buyers can discover your store and so deliveries can be arranged. Your precise coordinates are never shown publicly — buyers see your store area and landmark only.",
  },
  {
    heading: "5. Payments and escrow",
    body: "Buyer payments are held in escrow and only released to you after the buyer confirms delivery, or automatically 2 hours after delivery if no issue is raised. We store transaction records — amounts, fees, timestamps and payout status — as required to operate escrow and meet our financial obligations. We do not store card details.",
  },
  {
    heading: "6. Disputes and evidence",
    body: "When a buyer opens a dispute, the payment for that order is frozen and any photo evidence submitted by either side is stored with the dispute record until it is resolved. Dispute records are retained so outcomes can be reviewed.",
  },
  {
    heading: "7. How we share data",
    body: "We share data only where needed to run the service: identity details with our verification provider, delivery details with the rider handling your order, and payout details with our payment partners. We never sell your personal data.",
  },
  {
    heading: "8. Security",
    body: "Your data is transmitted over encrypted connections and access is restricted to what each part of the service needs. KYC references and payout details are held with additional restrictions.",
  },
  {
    heading: "9. Your choices and data deletion",
    body: "You can update your personal and store information from your profile at any time. To request a copy of your data or to have your account and data deleted, contact us at contact@o-fashmarkett.com. Some records (such as completed transactions) may be retained where the law requires it.",
  },
  {
    heading: "10. Changes to this policy",
    body: "If we make meaningful changes to this policy we will notify you in the app before they take effect.",
  },
];

const VendorPrivacyScreen = ({ navigation }) => (
  <SafeAreaView style={styles.flex} edges={["top"]}>
    <View style={styles.header}>
      <BackCircle onPress={() => navigation.goBack()} style={styles.back} />
      <Text style={styles.headerTitle}>PRIVACY POLICY</Text>
    </View>

    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.updated}>O-Fash Markett — Vendor Privacy Policy</Text>
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

export default VendorPrivacyScreen;
