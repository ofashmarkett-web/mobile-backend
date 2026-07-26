import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";

// Static HTML shell — loaded once. Pins are driven from React Native via
// injectJavaScript (window.setPin / window.setMarkers) so prop changes never
// reload the page. Pan/zoom stays interactive inside the WebView.
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
    // Multi-marker mode: colored dots, optional dashed route + fitBounds.
    var markerLayer = null;
    var MARKER_COLORS = { teal: "#0FB5AA", orange: "#F97316", red: "#E5484D" };
    window.setMarkers = function (list, routeBetween, fit) {
      if (markerLayer) { map.removeLayer(markerLayer); markerLayer = null; }
      var group = L.layerGroup();
      var points = [];
      (list || []).forEach(function (item) {
        if (typeof item.latitude !== "number" || typeof item.longitude !== "number") return;
        if (isNaN(item.latitude) || isNaN(item.longitude)) return;
        var latLng = [item.latitude, item.longitude];
        points.push(latLng);
        var dot = L.circleMarker(latLng, {
          radius: 9,
          color: "#FFFFFF",
          weight: 3,
          fillColor: MARKER_COLORS[item.color] || MARKER_COLORS.teal,
          fillOpacity: 1,
        });
        if (item.label) dot.bindTooltip(item.label);
        group.addLayer(dot);
      });
      if (routeBetween && points.length > 1) {
        group.addLayer(L.polyline(points, {
          color: "#17252B", weight: 2, opacity: 0.7, dashArray: "6 8",
        }));
      }
      group.addTo(map);
      markerLayer = group;
      if (fit && points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 16 });
      } else if (points.length === 1) {
        map.setView(points[0], 14, { animate: true });
      }
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
// Two modes, chosen by props:
//  - single pin: latitude/longitude/label (vendor onboarding — unchanged), or
//  - markers: [{latitude, longitude, label, color}] with optional routeBetween
//    (dashed polyline in order) and fit (fitBounds with padding).
const LeafletMap = ({
  latitude,
  longitude,
  label,
  height = 160,
  zoom = 16,
  markers,
  routeBetween = false,
  fit = false,
  style,
}) => {
  const webViewRef = useRef(null);
  const readyRef = useRef(false);
  const markerMode = Array.isArray(markers);
  const pinned = hasCoords(latitude, longitude);

  const pushPin = () => {
    if (!readyRef.current || !webViewRef.current) return;
    if (markerMode) {
      const valid = markers.filter((item) => hasCoords(item.latitude, item.longitude));
      webViewRef.current.injectJavaScript(
        `window.setMarkers(${JSON.stringify(valid)}, ${routeBetween ? "true" : "false"}, ${
          fit ? "true" : "false"
        }); true;`,
      );
      return;
    }
    if (!hasCoords(latitude, longitude)) return;
    webViewRef.current.injectJavaScript(
      `window.setPin(${latitude}, ${longitude}, ${JSON.stringify(label || "")}, ${zoom}); true;`,
    );
  };

  useEffect(() => {
    pushPin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, label, zoom, JSON.stringify(markers), routeBetween, fit]);

  // Marker mode always renders the live map (Nigeria overview while geocoding);
  // the single-pin path keeps its friendly placeholder until coords exist.
  if (!pinned && !markerMode) {
    return (
      <View style={[styles.card, styles.placeholder, { height }, style]}>
        <View style={styles.placeholderPin}>
          <Ionicons name="location" size={22} color={COLORS.teal} />
        </View>
        <Text style={styles.placeholderText}>Type your store address to pin it on the map</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { height }, style]}>
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
