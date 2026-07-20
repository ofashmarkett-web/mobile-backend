import React from "react";
import { StyleSheet } from "react-native";

// ---------------------------------------------------------------------------
// Global Montserrat typography.
//
// The codebase styles text with plain `fontWeight` values and no fontFamily.
// Custom fonts on Android ignore fontWeight, so we map each weight to the
// matching Montserrat face and inject it as `fontFamily` on every <Text> and
// <TextInput> app-wide.
//
// Mechanism (RN 0.81 / React 19): `Text` and `TextInput` are plain function
// components (no forwardRef, so there is no `.render` to monkey-patch).
// However, the `react-native` package exposes them through configurable
// getters on its CommonJS exports object, and Metro's ESM interop reads
// `_reactNative.Text` at every usage site. Redefining those getters once at
// startup (before anything renders) therefore swaps in our weight-aware
// wrappers for every consumer that imports from "react-native".
// ---------------------------------------------------------------------------

const FONT_BY_WEIGHT = {
  400: "Montserrat_400Regular",
  normal: "Montserrat_400Regular",
  500: "Montserrat_500Medium",
  600: "Montserrat_600SemiBold",
  700: "Montserrat_700Bold",
  bold: "Montserrat_700Bold",
  800: "Montserrat_800ExtraBold",
  900: "Montserrat_900Black",
};

const familyForWeight = (fontWeight) => {
  if (fontWeight == null) return FONT_BY_WEIGHT[400];
  return FONT_BY_WEIGHT[String(fontWeight)] || FONT_BY_WEIGHT[400];
};

const withMontserrat = (Component, displayName) => {
  const Wrapped = (props) => {
    const flat = StyleSheet.flatten(props.style) || {};
    // Respect any explicitly set fontFamily; only add one where missing.
    if (flat.fontFamily) {
      return React.createElement(Component, props);
    }
    return React.createElement(Component, {
      ...props,
      style: [props.style, { fontFamily: familyForWeight(flat.fontWeight) }],
    });
  };
  // Hoist statics (e.g. TextInput.State) so the wrapper is a drop-in.
  Object.assign(Wrapped, Component);
  Wrapped.displayName = displayName;
  return Wrapped;
};

let applied = false;

export function applyMontserrat() {
  if (applied) return;
  applied = true;

  // eslint-disable-next-line global-require
  const ReactNative = require("react-native");

  const PatchedText = withMontserrat(ReactNative.Text, "MontserratText");
  const PatchedTextInput = withMontserrat(
    ReactNative.TextInput,
    "MontserratTextInput",
  );

  Object.defineProperty(ReactNative, "Text", {
    configurable: true,
    enumerable: true,
    get: () => PatchedText,
  });
  Object.defineProperty(ReactNative, "TextInput", {
    configurable: true,
    enumerable: true,
    get: () => PatchedTextInput,
  });
}
