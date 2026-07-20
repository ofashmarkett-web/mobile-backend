import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStore } from "../../store/userStore";
import { resolveRoleLanding } from "../../services/apiClient";
import { COLORS } from "../../theme/colors";

const STEPS = [
  { key: "logo" },
  {
    key: "stall",
    heading: "EVERY STYLE HAS A STALL",
    subtitle:
      "Thrift, luxury, Ankara, Sneakers.\nWhatever you are looking for, there is a vendor here for you",
  },
  {
    key: "market",
    heading: "YOUR STYLE, YOUR MARKET",
    subtitle: "Shop fashion from real vendors near you or sell what you've got, your way",
  },
];

// 7s per step so the brand copy is comfortably readable; tapping the screen
// advances immediately.
const STEP_DURATION_MS = 7000;

const SplashScreen = ({ navigation }) => {
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const [step, setStep] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const routedRef = useRef(false);

  const routeAfterSplash = async () => {
    if (routedRef.current) return;
    routedRef.current = true;

    const session = await hydrateSession();
    const role = session?.user?.role;
    const parent = navigation.getParent?.();

    if (role === "vendor" || role === "rider") {
      // Land on the dashboard if onboarding is already submitted; otherwise
      // resume onboarding where the flow starts.
      const screen = await resolveRoleLanding(session.token, role);
      parent?.replace(role === "vendor" ? "Vendor" : "Rider", { screen });
      return;
    }

    if (role === "buyer") {
      parent?.replace("Buyer");
      return;
    }

    parent?.replace("Auth");
  };

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      routeAfterSplash();
    }
  };

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        routeAfterSplash();
      }
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const current = STEPS[step];

  return (
    <SafeAreaView style={styles.safeArea} onTouchEnd={advance}>
      {current.key === "logo" ? (
        <Animated.View style={[styles.centerFrame, { opacity }]}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.centerFrame, { opacity }]}>
          <View style={styles.copyBlock}>
            <Text style={styles.headline}>{current.heading}</Text>
            <Text style={styles.subtitle}>{current.subtitle}</Text>
          </View>
        </Animated.View>
      )}

      {current.key === "logo" ? <Text style={styles.version}>VERSION 1.0</Text> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centerFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 142,
    height: 88,
  },
  copyBlock: {
    alignItems: "center",
  },
  headline: {
    color: COLORS.teal,
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    maxWidth: 300,
    color: COLORS.slate,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  version: {
    position: "absolute",
    bottom: 42,
    alignSelf: "center",
    color: COLORS.faint,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
});

export default SplashScreen;
