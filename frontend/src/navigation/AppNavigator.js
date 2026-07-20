import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createNavigationContainerRef } from "@react-navigation/native";

import OnboardingNavigator from "./OnboardingNavigator";
import AuthNavigator from "./AuthNavigator";
import BuyerNavigator from "./BuyerNavigator";
import VendorNavigator from "./VendorNavigator";
import RiderNavigator from "./RiderNavigator";
import { IS_RIDER_APP } from "../config/appVariant";

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
      {IS_RIDER_APP ? (
        // Rider app: rider screens only — no buyer/vendor surface at all.
        <Stack.Screen name="Rider" component={RiderNavigator} />
      ) : (
        // Market app: buyer + vendor only — the Rider navigator is not
        // registered, so rider screens are unreachable.
        <>
          <Stack.Screen name="Buyer" component={BuyerNavigator} />
          <Stack.Screen name="Vendor" component={VendorNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
