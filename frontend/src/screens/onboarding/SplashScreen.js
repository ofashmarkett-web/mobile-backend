import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStore } from "../../store/userStore";
import { resolveRoleLanding } from "../../services/apiClient";
import { COLORS } from "../../theme/colors";
import { IS_RIDER_APP } from "../../config/appVariant";

const STEPS = [
  {
    key: "logo",
    eyebrow: "NIGERIA'S FASHION MARKET",
    heading: "FASHION THAT\nMOVES WITH YOU",
    subtitle: "Discover pieces worth keeping, from vendors near you.",
  },
  {
    key: "market",
    heading: "YOUR STYLE, YOUR MARKET",
    subtitle: "Shop fashion from real vendors near you or sell what you've got, your way",
  },
  {
    key: "stall",
    heading: "EVERY STYLE HAS A STALL",
    subtitle:
      "Thrift, luxury, Ankara, Sneakers.\nWhatever you are looking for, there is a vendor here for you",
  },
];

const STEP_DURATION_MS = 5000;

const SplashScreen = ({ navigation }) => {
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const resetUser = useUserStore((state) => state.resetUser);
  const [step, setStep] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const accentProgress = useRef(new Animated.Value(0)).current;
  const routedRef = useRef(false);

  const routeAfterSplash = async () => {
    if (routedRef.current) return;
    routedRef.current = true;

    const session = await hydrateSession();
    const role = session?.user?.role;
    const parent = navigation.getParent?.();

    // Each app variant only serves its own roles — a stored session for the
    // wrong variant is signed out and sent back to Auth.
    if (!IS_RIDER_APP && role === "rider") {
      resetUser();
      Alert.alert("Rider account", "Rider accounts use the O-Fash Rider app.");
      parent?.replace("Auth");
      return;
    }

    if (IS_RIDER_APP && (role === "buyer" || role === "vendor")) {
      resetUser();
      Alert.alert(
        "O-Fash Rider",
        "This is the O-Fash Rider app — use the main O-Fash Markett app to shop or sell.",
      );
      parent?.replace("Auth");
      return;
    }

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
    translateY.setValue(20);
    scale.setValue(0.88);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

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

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(accentProgress, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(accentProgress, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [accentProgress]);

  const current = STEPS[step];
  const accentScale = accentProgress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] });
  const accentOpacity = accentProgress.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.38] });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        {current.key === "logo" ? <View /> : <Text style={styles.brand}>O-FASH</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" hitSlop={12} onPress={routeAfterSplash}>
          <Text style={[styles.skip, current.key === "logo" && styles.skipMuted]}>SKIP</Text>
        </Pressable>
      </View>

      <Pressable style={styles.pressArea} onPress={advance} accessibilityRole="button" accessibilityLabel="Continue introduction">
        <Animated.View style={[styles.centerFrame, current.key !== "logo" && styles.copyFrame, { opacity, transform: [{ translateY }] }]}>
          {current.key === "logo" ? (
            <View style={styles.logoScene}>
              <Animated.View style={[styles.logoHalo, { opacity: accentOpacity, transform: [{ scale: accentScale }] }]} />
              <Animated.View style={{ transform: [{ scale }] }}>
                <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
              </Animated.View>
            </View>
          ) : (
            <>
              <Animated.View style={[styles.accent, { opacity: accentOpacity, transform: [{ scaleX: accentScale }] }]} />
              <View style={styles.copyBlock}>
                <Text style={styles.headline}>{current.heading}</Text>
                <Text style={styles.subtitle}>{current.subtitle}</Text>
              </View>
            </>
          )}
        </Animated.View>
      </Pressable>

      <View style={styles.footer}>
        {current.key === "logo" ? <Text style={styles.version}>VERSION 1.0</Text> : <View style={styles.progress}>
          {STEPS.map((item, index) => <View key={item.key} style={[styles.dot, index === step && styles.dotActive]} />)}
        </View>}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  topBar: {
    paddingHorizontal: 26,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  skip: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  skipMuted: { opacity: 0 },
  pressArea: {
    flex: 1,
  },
  centerFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  copyFrame: {
    justifyContent: "flex-start",
    paddingTop: 30,
  },
  logoScene: {
    width: 220,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  logoHalo: {
    ...StyleSheet.absoluteFillObject,
    width: 116,
    height: 116,
    borderRadius: 58,
    alignSelf: "center",
    top: 27,
    backgroundColor: COLORS.tealSoft,
  },
  logo: {
    width: 132,
    height: 94,
  },
  copyBlock: {
    alignItems: "center",
  },
  accent: {
    width: 34,
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    marginBottom: 16,
  },
  headline: {
    color: COLORS.primary,
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: 0,
    textAlign: "center",
    marginBottom: 15,
  },
  subtitle: {
    maxWidth: 310,
    color: COLORS.slate,
    fontSize: 9,
    lineHeight: 13,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    minHeight: 48,
    paddingBottom: 14,
  },
  progress: {
    flexDirection: "row",
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.line,
  },
  dotActive: {
    width: 25,
    backgroundColor: COLORS.teal,
  },
  version: {
    color: COLORS.faint,
    fontSize: 10,
    letterSpacing: 1.6,
  },
});

export default SplashScreen;
