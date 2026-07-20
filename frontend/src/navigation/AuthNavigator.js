import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthScreen from "../screens/auth/AuthScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import OTPVerificationScreen from "../screens/auth/OTPVerificationScreen";
import RoleSelectionScreen from "../screens/auth/RoleSelectionScreen";
import LegalAgreementScreen from "../screens/auth/LegalAgreementScreen";
import KYCScreen from "../screens/auth/KYCScreen";
import BiometricSetupScreen from "../screens/auth/BiometricSetupScreen";
import ProfileSwitchScreen from "../screens/common/ProfileSwitchScreen";

const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AuthRoot" component={AuthScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    <Stack.Screen name="LegalAgreement" component={LegalAgreementScreen} />
    <Stack.Screen name="KYC" component={KYCScreen} />
    <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
    <Stack.Screen name="ProfileSwitch" component={ProfileSwitchScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
