import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const SplashScreen = ({ navigation }) => {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Auth");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={styles.title}>
          O-FASH MARKETT
        </Text>
        <Text variant="bodyMedium" style={styles.node}>
          Node: 34-8
        </Text>
      </View>
      <ActivityIndicator animating size="small" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 112,
    height: 112,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
  },
  node: {
    opacity: 0.56,
  },
});

export default SplashScreen;
