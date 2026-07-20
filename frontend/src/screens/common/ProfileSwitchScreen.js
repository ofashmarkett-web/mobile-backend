import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../theme/colors";
import { useUserStore } from "../../store/userStore";

// Routes a signed-in user straight into their workspace. Vendors land on the
// dashboard, not the onboarding steps; riders still go through setup until the
// rider workspace is built.
const ProfileSwitchScreen = ({ navigation }) => {
  const role = useUserStore((state) => state.userMetadata.role);

  useEffect(() => {
    if (role === "vendor") {
      navigation.navigate("Vendor", { screen: "VendorDashboard" });
    } else if (role === "rider") {
      navigation.navigate("Rider", { screen: "RiderStart" });
    } else {
      navigation.navigate("Buyer");
    }
  }, [role, navigation]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.teal} size="large" />
      <Text style={styles.text}>Opening your workspace...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    gap: 12,
  },
  text: { fontSize: 13, color: COLORS.muted },
});

export default ProfileSwitchScreen;
