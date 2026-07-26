import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import { useUserStore } from "../../store/userStore";
import VendorTabBar, { BUYER_TABS } from "../../components/vendor/VendorTabBar";
import BuyerHomeTab from "./tabs/BuyerHomeTab";
import BuyerCategoriesTab from "./tabs/BuyerCategoriesTab";
import BuyerOrdersTab from "./tabs/BuyerOrdersTab";
import BuyerCartTab from "./tabs/BuyerCartTab";
import BuyerProfileTab from "./tabs/BuyerProfileTab";

const TAB_SCREENS = {
  home: BuyerHomeTab,
  categories: BuyerCategoriesTab,
  orders: BuyerOrdersTab,
  cart: BuyerCartTab,
  profile: BuyerProfileTab,
};

const BuyerTabsScreen = ({ navigation, route }) => {
  const [active, setActive] = useState(route.params?.initialTab || "home");
  const [focusKey, setFocusKey] = useState(0);
  const hydrateCart = useUserStore((state) => state.hydrateCart);
  const hydrateBuyerPrefs = useUserStore((state) => state.hydrateBuyerPrefs);

  // Load the persisted cart and prefs before any tab (or a product screen
  // pushed from one) mutates them.
  useEffect(() => {
    hydrateCart();
    hydrateBuyerPrefs();
  }, [hydrateCart, hydrateBuyerPrefs]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => setFocusKey((v) => v + 1));
    return unsubscribe;
  }, [navigation]);

  // Screens deeper in the stack (e.g. checkout) can jump to a specific tab by
  // navigating back here with { initialTab } — consume the param once.
  useEffect(() => {
    const tab = route.params?.initialTab;
    if (tab && TAB_SCREENS[tab]) {
      setActive(tab);
      navigation.setParams({ initialTab: undefined });
    }
  }, [route.params?.initialTab, navigation]);

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
