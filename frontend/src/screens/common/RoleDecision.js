import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStore } from "../../store/userStore";

const roles = [
  {
    key: "buyer",
    title: "Buyer",
    description: "Shop fashion and track orders.",
    route: "LegalAgreement",
  },
  {
    key: "vendor",
    title: "Vendor",
    description: "Open your store and manage sales.",
    route: "LegalAgreement",
  },
  {
    key: "rider",
    title: "Rider",
    description: "Deliver orders and set ride rates.",
    route: "LegalAgreement",
  },
];

const RoleDecision = ({ navigation }) => {
  const theme = useTheme();
  const setRole = useUserStore((state) => state.setRole);

  const handleSelect = (role) => {
    setRole(role.key);
    navigation.navigate(role.route);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Choose your path
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Continue as buyer, vendor, or rider.
        </Text>
      </View>

      <View style={styles.grid}>
        {roles.map((role) => (
          <Surface key={role.key} mode="elevated" elevation={2} style={styles.card}>
            <View style={styles.cardText}>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {role.title}
              </Text>
              <Text variant="bodyMedium" style={styles.cardDescription}>
                {role.description}
              </Text>
            </View>
            <Button mode="contained" onPress={() => handleSelect(role)}>
              Continue
            </Button>
          </Surface>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
    gap: 6,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.68,
  },
  grid: {
    gap: 14,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    gap: 18,
  },
  cardText: {
    gap: 6,
  },
  cardTitle: {
    fontWeight: "700",
  },
  cardDescription: {
    opacity: 0.72,
  },
});

export default RoleDecision;
