import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/onboarding/SplashScreen";
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import MarketingSourceScreen from "../screens/onboarding/MarketingSourceScreen";

const Stack = createNativeStackNavigator();

const OnboardingNavigator = () => (
  <Stack.Navigator
    initialRouteName="Splash"
    screenOptions={{
      headerShown: false,
      animation: "fade",
    }}
  >
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="MarketingSource" component={MarketingSourceScreen} />
  </Stack.Navigator>
);

export default OnboardingNavigator;
