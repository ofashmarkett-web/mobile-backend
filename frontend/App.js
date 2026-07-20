import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from "@expo-google-fonts/montserrat";

import { applyMontserrat } from "./src/theme/typography";

// Patch Text/TextInput once at startup, before any screen renders, so every
// fontWeight in the app maps to the matching Montserrat face.
applyMontserrat();

import AppNavigator, { navigationRef } from "./src/navigation/AppNavigator";
import { COLORS } from "./src/theme/colors";

// Define the theme to be used by React Native Paper components
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary || "#008080", // Replace with your brand primary
    secondary: COLORS.secondary || "#666666",
    background: COLORS.white || "#FFFFFF",
    surface: COLORS.white || "#FFFFFF",
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
  });

  // Keep the splash/blank state until the Montserrat faces are available so
  // no screen ever renders with a fallback font.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={theme}>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
