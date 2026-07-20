import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import BackCircle from "./BackCircle";
import PillButton from "./PillButton";

// Deep charcoal shade of the brand teal (COLORS.tealDark) for the capture screen.
const DARK_TEAL = "#0E3B3D";

const pickDocumentPhoto = async () => {
  // Prefer the device camera; fall back to the photo library when the
  // camera is unavailable or permission is denied (e.g. emulators).
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.granted) {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled) return null;
      return result.assets[0];
    }
  } catch (error) {
    // fall through to the library picker
  }

  const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!libraryPermission.granted) {
    Alert.alert("Access needed", "Allow camera or photo access to capture your ID.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  if (result.canceled) return null;
  return result.assets[0];
};

const Corner = ({ position }) => <View style={[styles.corner, cornerStyles[position]]} />;

/**
 * Dark full-screen ID document capture with corner-bracket frame and a white
 * "Is this clear enough?" confirm bottom sheet. Role-agnostic.
 *
 * Props:
 * - onConfirm: async (asset) => void — upload the photo + run the KYC check.
 *   Throw to keep the sheet open and show an alert.
 * - onDone: called after onConfirm resolves (advance to the next step)
 * - onBack
 * - title, subtitle, frameLabel, captureLabel, confirmTitle, confirmSubtitle,
 *   confirmBusyLabel: overridable copy
 */
const DocumentCaptureScreen = ({
  title = "ID document capture",
  subtitle = "Hold your ID flat inside the frame. All four corners visible, text sharp and readable. Its gotta be clean.",
  frameLabel = "FIT YOUR ID HERE",
  captureLabel = "Capture ID",
  confirmTitle = "Is this clear enough?",
  confirmSubtitle = "Check that every corner shows and the details are readable before you confirm. Blurry IDs get rejected, save yourself the back and forth.",
  confirmBusyLabel = "Checking your ID...",
  onConfirm,
  onDone,
  onBack,
}) => {
  const [asset, setAsset] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    const photo = await pickDocumentPhoto();
    if (!photo) return;
    setAsset(photo);
    setSheetOpen(true);
  };

  const retake = () => {
    setSheetOpen(false);
    setAsset(null);
    setTimeout(capture, 350);
  };

  const useThis = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm?.(asset);
      setSheetOpen(false);
      onDone?.(asset);
    } catch (error) {
      Alert.alert("Document check failed", error.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackCircle onPress={onBack} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.frameLabel}>{frameLabel}</Text>
        <View style={styles.frame}>
          {asset ? <Image source={{ uri: asset.uri }} style={styles.framePhoto} /> : null}
          <Corner position="tl" />
          <Corner position="tr" />
          <Corner position="bl" />
          <Corner position="br" />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PillButton
          label={asset ? "Review photo" : captureLabel}
          onPress={asset ? () => setSheetOpen(true) : capture}
        />
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !busy && setSheetOpen(false)}
      >
        <View style={styles.scrim}>
          <Pressable style={styles.scrimTouch} onPress={() => !busy && setSheetOpen(false)} />
          <View style={[styles.sheet, SHADOWS.sheet]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{confirmTitle}</Text>
            <Text style={styles.sheetSubtitle}>{confirmSubtitle}</Text>
            <View style={styles.previewCard}>
              {asset ? <Image source={{ uri: asset.uri }} style={styles.preview} /> : null}
            </View>
            <View style={styles.sheetButtons}>
              <PillButton
                label="Retake"
                variant="outline"
                onPress={retake}
                disabled={busy}
                style={styles.sheetButton}
              />
              <PillButton
                label="Yes, use this"
                busy={busy}
                busyLabel={confirmBusyLabel}
                onPress={useThis}
                style={styles.sheetButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const CORNER_SIZE = 34;
const CORNER_THICKNESS = 4;

const cornerStyles = StyleSheet.create({
  tl: {
    top: -2,
    left: -2,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 16,
  },
  tr: {
    top: -2,
    right: -2,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 16,
  },
  bl: {
    bottom: -2,
    left: -2,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 16,
  },
  br: {
    bottom: -2,
    right: -2,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 16,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DARK_TEAL,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.white,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.68)",
  },
  frameLabel: {
    marginTop: 44,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    color: COLORS.white,
    textAlign: "center",
  },
  frame: {
    marginTop: 18,
    alignSelf: "stretch",
    height: 204,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    overflow: "visible",
  },
  framePhoto: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.teal,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
  },
  scrim: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    justifyContent: "flex-end",
  },
  scrimTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.line,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
  },
  sheetSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.slate,
  },
  previewCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 6,
  },
  preview: {
    width: "100%",
    height: 175,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  sheetButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  sheetButton: {
    flex: 1,
  },
});

export default DocumentCaptureScreen;
