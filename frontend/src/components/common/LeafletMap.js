import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";

// Static HTML shell — loaded once. The pin is driven from React Native via
// injectJavaScript(window.setPin(...)) so prop changes never reload the page.
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #E9F1EC; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map("map", { zoomControl: false, attributionControl: true })
      .setView([9.082, 8.6753], 5); // Nigeria overview until a pin arrives
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    var marker = null;
    window.setPin = function (lat, lng, label, zoom) {
      if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return;
      if (!marker) {
        marker = L.marker([lat, lng]).addTo(map);
      } else {
        marker.setLatLng([lat, lng]);
      }
      if (label) {
        marker.bindPopup(label);
      }
      map.setView([lat, lng], zoom || 16, { animate: true });
    };
    // Signal readiness so RN can push the initial pin.
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage("map-ready");
    }
  </script>
</body>
</html>`;

const hasCoords = (latitude, longitude) =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  !Number.isNaN(latitude) &&
  !Number.isNaN(longitude);

// Module-scope component (never define components inside components).
// Renders a live Leaflet/OpenStreetMap card; while there are no coordinates it
// shows a friendly placeholder instead of an empty map.
const LeafletMap = ({ latitude, longitude, label, height = 160, zoom = 16 }) => {
  const webViewRef = useRef(null);
  const readyRef = useRef(false);
  const pinned = hasCoords(latitude, longitude);

  const pushPin = () => {
    if (!readyRef.current || !webViewRef.current) return;
    if (!hasCoords(latitude, longitude)) return;
    webViewRef.current.injectJavaScript(
      `window.setPin(${latitude}, ${longitude}, ${JSON.stringify(label || "")}, ${zoom}); true;`,
    );
  };

  useEffect(() => {
    pushPin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, label, zoom]);

  if (!pinned) {
    return (
      <View style={[styles.card, styles.placeholder, { height }]}>
        <View style={styles.placeholderPin}>
          <Ionicons name="location" size={22} color={COLORS.teal} />
        </View>
        <Text style={styles.placeholderText}>Type your store address to pin it on the map</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { height }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: MAP_HTML }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onLoadStart={() => {
          readyRef.current = false;
        }}
        onMessage={(event) => {
          if (event.nativeEvent.data === "map-ready") {
            readyRef.current = true;
            pushPin();
          }
        }}
        onLoadEnd={() => {
          readyRef.current = true;
          pushPin();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E9F1EC",
    borderWidth: 1,
    borderColor: COLORS.line,
    ...SHADOWS.card,
  },
  web: {
    flex: 1,
    backgroundColor: "transparent",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  placeholderPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    ...SHADOWS.card,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.slate,
    textAlign: "center",
  },
});

export default LeafletMap;
