import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AvailableRidesScreen from "../screens/rider/AvailableRidesScreen";
import DeliveryVerificationScreen from "../screens/rider/DeliveryVerificationScreen";
import MapNavigationScreen from "../screens/rider/MapNavigationScreen";
import RiderDashboard from "../screens/rider/RiderDashboard";
import RiderOnboardingStepScreen from "../screens/rider/RiderOnboardingStepScreen";
import SetRatesScreen from "../screens/rider/SetRatesScreen";

const Stack = createNativeStackNavigator();

// Onboarding flow order (Figma rider track). "RiderStart" is the entry route
// name referenced from OTPVerificationScreen/ProfileSwitchScreen — keep it.
const riderSteps = [
  ["RiderStart", "147-2868", "Who can vouch for you?"],
  ["RiderVehicle", "147-3117", "Tell us about your ride"],
  ["RiderCompany", "147-3132", "Delivery company"],
  ["RiderPayout", "147-3000", "Set up your payout account"],
  ["RiderKycIntro", "147-2786", "Verify your identity"],
  ["RiderNin", "147-2886", "Enter your NIN"],
  ["RiderDocs", "147-3931", "Driver's licence capture"],
  ["RiderLiveness", "147-2858", "Selfie/Liveness check"],
  ["RiderSubmitted", "147-3010", "Application submitted"],
];

const RiderNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {riderSteps.map(([name, nodeId, title], index) => (
      <Stack.Screen
        key={name}
        name={name}
        component={RiderOnboardingStepScreen}
        initialParams={{
          nodeId,
          title,
          nextRoute: riderSteps[index + 1]?.[0] || "RiderDashboard",
        }}
      />
    ))}
    <Stack.Screen name="RiderDashboard" component={RiderDashboard} />
    <Stack.Screen name="AvailableRides" component={AvailableRidesScreen} />
    <Stack.Screen name="MapNavigation" component={MapNavigationScreen} />
    <Stack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} />
    <Stack.Screen name="SetRates" component={SetRatesScreen} />
  </Stack.Navigator>
);

export default RiderNavigator;
