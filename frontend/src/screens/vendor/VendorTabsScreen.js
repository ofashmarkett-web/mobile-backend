import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import VendorTabBar from "../../components/vendor/VendorTabBar";
import HomeTab from "./tabs/HomeTab";
import ListingsTab from "./tabs/ListingsTab";
import OrdersTab from "./tabs/OrdersTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import ProfileTab from "./tabs/ProfileTab";

const TAB_SCREENS = {
  home: HomeTab,
  listings: ListingsTab,
  orders: OrdersTab,
  analytics: AnalyticsTab,
  profile: ProfileTab,
};

// Hosts the five vendor dashboard tabs behind a custom tab bar. The active tab
// remounts on focus/switch so its data is always refetched from the API.
const VendorTabsScreen = ({ navigation, route }) => {
  const [active, setActive] = useState(route.params?.initialTab || "home");
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () =>
      setFocusKey((value) => value + 1),
    );
    return unsubscribe;
  }, [navigation]);

  const ActiveTab = TAB_SCREENS[active] || HomeTab;

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <View style={styles.flex}>
        <ActiveTab
          key={`${active}-${focusKey}`}
          navigation={navigation}
          switchTab={setActive}
        />
      </View>
      <VendorTabBar active={active} onChange={setActive} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
});

export default VendorTabsScreen;
