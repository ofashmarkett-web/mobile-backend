import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import VendorTabBar, { BUYER_TABS } from "../../components/vendor/VendorTabBar";
import BuyerHomeTab from "./tabs/BuyerHomeTab";
import BuyerSearchTab from "./tabs/BuyerSearchTab";
import BuyerOrdersTab from "./tabs/BuyerOrdersTab";
import BuyerProfileTab from "./tabs/BuyerProfileTab";

const TAB_SCREENS = {
  home: BuyerHomeTab,
  search: BuyerSearchTab,
  orders: BuyerOrdersTab,
  profile: BuyerProfileTab,
};

const BuyerTabsScreen = ({ navigation }) => {
  const [active, setActive] = useState("home");
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => setFocusKey((v) => v + 1));
    return unsubscribe;
  }, [navigation]);

  const ActiveTab = TAB_SCREENS[active] || BuyerHomeTab;

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <View style={styles.flex}>
        <ActiveTab key={`${active}-${focusKey}`} navigation={navigation} switchTab={setActive} />
      </View>
      <VendorTabBar active={active} onChange={setActive} tabs={BUYER_TABS} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
});

export default BuyerTabsScreen;
