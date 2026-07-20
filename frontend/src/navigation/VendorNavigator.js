import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VendorDashboard from "../screens/vendor/VendorDashboard";
import AddListingScreen from "../screens/vendor/AddListingScreen";
import VendorProductDetailScreen from "../screens/vendor/VendorProductDetailScreen";
import VendorOrderDetailScreen from "../screens/vendor/VendorOrderDetailScreen";
import DisputesScreen from "../screens/vendor/DisputesScreen";
import DisputeDetailScreen from "../screens/vendor/DisputeDetailScreen";
import VendorOnboardingStepScreen from "../screens/vendor/VendorOnboardingStepScreen";
import VendorNotificationsScreen from "../screens/vendor/VendorNotificationsScreen";
import VendorPersonalInfoScreen from "../screens/vendor/VendorPersonalInfoScreen";
import VendorSupportScreen from "../screens/vendor/VendorSupportScreen";
import VendorPrivacyScreen from "../screens/vendor/VendorPrivacyScreen";
import VendorTermsScreen from "../screens/vendor/VendorTermsScreen";

const Stack = createNativeStackNavigator();

// Mockup order: KYC (intro → NIN → document → liveness) then store
// setup (info → CAC → branding → location → payout) then submitted.
// "VendorStart" stays first — it is navigated to from OTPVerificationScreen.
const vendorSteps = [
  ["VendorStart", "133-2063", "Verify your identity"],
  ["VendorKycNin", "133-2109", "NIN verification"],
  ["VendorKycDocument", "133-2131", "ID document capture"],
  ["VendorKycLiveness", "133-2139", "Liveness check"],
  ["VendorStoreInfo", "147-2366", "Store information"],
  ["VendorCac", "133-1108", "CAC registration"],
  ["VendorBranding", "133-1309", "Store branding"],
  ["VendorLocation", "147-1804", "Location & hours"],
  ["VendorPayout", "147-2463", "Payout account"],
  // Onboarding ends here — the old post-approval Figma node steps were
  // replaced by the real tabbed VendorDashboard.
  ["VendorSubmitted", "133-2822", "Application submitted"],
];

const VendorNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {vendorSteps.map(([name, nodeId, title], index) => (
      <Stack.Screen
        key={name}
        name={name}
        component={VendorOnboardingStepScreen}
        initialParams={{
          nodeId,
          title,
          nextRoute: vendorSteps[index + 1]?.[0] || "VendorDashboard",
          nextLabel: index + 1 === vendorSteps.length ? "Open dashboard" : "Continue",
        }}
      />
    ))}
    <Stack.Screen name="VendorDashboard" component={VendorDashboard} />
    <Stack.Screen
      name="AddListing"
      component={AddListingScreen}
      options={{ presentation: "transparentModal", animation: "slide_from_bottom" }}
    />
    <Stack.Screen name="VendorProductDetail" component={VendorProductDetailScreen} />
    <Stack.Screen name="VendorOrderDetail" component={VendorOrderDetailScreen} />
    <Stack.Screen name="VendorDisputes" component={DisputesScreen} />
    <Stack.Screen name="VendorDisputeDetail" component={DisputeDetailScreen} />
    <Stack.Screen name="VendorNotifications" component={VendorNotificationsScreen} />
    <Stack.Screen name="VendorPersonalInfo" component={VendorPersonalInfoScreen} />
    <Stack.Screen name="VendorSupport" component={VendorSupportScreen} />
    <Stack.Screen name="VendorPrivacy" component={VendorPrivacyScreen} />
    <Stack.Screen name="VendorTerms" component={VendorTermsScreen} />
  </Stack.Navigator>
);

export default VendorNavigator;
