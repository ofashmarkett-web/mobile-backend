import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import BackCircle from "./BackCircle";
import ResultSheet from "./ResultSheet";

const DEFAULT_PROMPTS = ["Turn slightly to the right", "Blink slowly", "Hold still..."];

// expo-camera is not installed, so the oval is a soft placeholder and the
// actual selfie (when possible) is taken with the image-picker front camera.
const takeSelfie = async () => {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      cameraType: ImagePicker.CameraType.front,
      quality: 0.8,
    });
    if (result.canceled) return null;
    return result.assets[0];
  } catch (error) {
    return null;
  }
};

/**
 * Selfie / liveness check screen. Role-agnostic.
 *
 * Cycles the on-screen prompts on a timer, optionally opens the front camera
 * for a selfie, then calls onRun and shows a success/failure bottom sheet.
 *
 * Props:
 * - onRun: async (selfieAsset | null) => ({ state: "success" | "failed" })
 * - onSuccess: called when the user taps Continue on the success sheet
 * - onBack
 * - captureSelfie: open the front camera after the prompts (default true)
 * - prompts, promptInterval (~1.8s per prompt), title, subtitle,
 *   successHeading/successMessage/failedHeading/failedMessage: overridable
 */
const LivenessScreen = ({
  title = "Selfie/Liveness check",
  subtitle = "Look straight at the camera. Fit your face inside the oval. Make sure your face is fully visible — no caps, no glasses.",
  prompts = DEFAULT_PROMPTS,
  promptInterval = 1800,
  captureSelfie = true,
  onRun,
  onSuccess,
  onBack,
  successHeading = "You're all clear!",
  successMessage = "Verified in real time — that's really you. Keep it moving.",
  failedHeading = "Let's try that again",
  failedMessage = "Didn't catch that. Find a well-lit spot, look straight at the camera, and move slowly when prompted.",
}) => {
  const [runId, setRunId] = useState(0);
  const [statusLine, setStatusLine] = useState(prompts[0]);
  const [result, setResult] = useState(null); // null | "success" | "failed"

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      let selfie = null;

      if (captureSelfie) {
        if (!cancelled) setStatusLine("Get ready — opening the camera...");
        selfie = await takeSelfie();
      }

      if (cancelled) return;
      setStatusLine("Checking...");

      let outcome;
      try {
        outcome = await onRun?.(selfie);
      } catch (error) {
        outcome = { state: "failed" };
      }

      if (cancelled) return;
      setResult(outcome?.state === "success" ? "success" : "failed");
    };

    setResult(null);
    setStatusLine(prompts[0]);
    const timers = prompts.map((prompt, index) =>
      setTimeout(() => setStatusLine(prompt), index * promptInterval),
    );
    timers.push(setTimeout(finish, prompts.length * promptInterval));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const retry = () => {
    setResult(null);
    setRunId((id) => id + 1);
  };

  const finishSuccess = () => {
    setResult(null);
    onSuccess?.();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <BackCircle onPress={onBack} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.ovalArea}>
          <View style={styles.glow}>
            <View style={styles.glowInner}>
              <View style={styles.oval}>
                <View style={styles.ovalTint} />
                <Ionicons name="person" size={120} color="rgba(15, 181, 170, 0.35)" />
              </View>
            </View>
          </View>
          <Text style={styles.prompt}>{statusLine}</Text>
        </View>
      </View>

      <ResultSheet
        visible={result === "success"}
        tone="success"
        badge="LIVENESS CHECK SUCCESSFUL"
        icon="happy"
        heading={successHeading}
        message={successMessage}
        actionLabel="Continue"
        onAction={finishSuccess}
        onDismiss={finishSuccess}
      />
      <ResultSheet
        visible={result === "failed"}
        tone="failed"
        badge="LIVENESS CHECK FAILED"
        icon="sad"
        heading={failedHeading}
        message={failedMessage}
        actionLabel="Retry"
        onAction={retry}
        onDismiss={retry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.ink,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.slate,
  },
  ovalArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(230, 247, 245, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  glowInner: {
    width: 278,
    height: 278,
    borderRadius: 139,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  oval: {
    width: 254,
    height: 254,
    borderRadius: 127,
    backgroundColor: "#D8F0ED",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ovalTint: {
    position: "absolute",
    bottom: -40,
    width: 254,
    height: 160,
    borderRadius: 127,
    backgroundColor: "#C4E9E4",
  },
  prompt: {
    marginTop: 26,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
    textAlign: "center",
  },
});

export default LivenessScreen;
