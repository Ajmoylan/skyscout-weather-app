import { useEffect, useState } from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import * as Location from "expo-location";

export default function City({ onCityChange, onCoordsChange }) {
  const [statusText, setStatusText] = useState("Getting your location...");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          const msg = "Location permission denied";
          if (!cancelled) {
            setStatusText(msg);
            onCityChange?.(msg);
          }
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;

        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;

        onCoordsChange?.({ latitude: lat, longitude: lon });

        let label = null;

        // Reverse geocode ONLY on native (web often blocked by CORS)
        if (Platform.OS !== "web") {
          const places = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lon,
          });
          const place = places?.[0];
          label =
            place?.city ||
            place?.locality ||
            place?.subregion ||
            place?.region ||
            place?.district ||
            null;
        }

        if (!label) {
          label = `Lat ${lat.toFixed(3)}, Lon ${lon.toFixed(3)}`;
        }

        if (!cancelled) {
          setStatusText(`Location: ${label}`);
          onCityChange?.(label);
        }
      } catch (err) {
        if (!cancelled) {
          setStatusText("Location unavailable");
          onCityChange?.("Unknown location");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bannerText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
});