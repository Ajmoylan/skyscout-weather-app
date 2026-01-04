import React, { useEffect, useMemo, useRef } from "react";
import { Text, View, StyleSheet, Platform, Animated, Pressable } from "react-native";

const themes = {
  light: {
    cardBg: "#ffffff",
    title: "#1a73e8",
    city: "#111827",
    summary: "#4b5563",
    border: "#e5e7eb",
    chipBg: "#eef2ff",
    chipText: "#3730a3",
  },
  dark: {
    cardBg: "#0f172a",
    title: "#facc15",
    city: "#f9fafb",
    summary: "#cbd5f5",
    border: "#1f2937",
    chipBg: "#1f2937",
    chipText: "#f9fafb",
  },
};

function summaryToIcon(summary) {
  const s = (summary || "").toLowerCase();
  if (s.includes("clear")) return "☀️";
  if (s.includes("cloud")) return "⛅️";
  if (s.includes("fog")) return "🌫️";
  if (s.includes("rain")) return "🌧️";
  if (s.includes("snow")) return "❄️";
  if (s.includes("thunder")) return "⛈️";
  if (s.includes("unknown")) return "❔";
  return "🌤️";
}

export default function Weather({
  city,
  weather,
  temp,
  theme = "light",
  updatedAt,
  rightSlot = null,
  isActive = false,
  variant = "normal", // "normal" | "compact"
  onPressIn,
}) {
  const t = themes[theme] || themes.light;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 160,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [city, weather, temp, updatedAt]);

  const icon = useMemo(() => summaryToIcon(weather), [weather]);
  const compact = variant === "compact";

  const baseShadow =
    Platform.OS === "web"
      ? { boxShadow: "0px 10px 24px rgba(0,0,0,0.10)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        };

  return (
    <Pressable onPressIn={onPressIn}>
      <Animated.View
        style={[
          styles.cardBase,
          !compact ? baseShadow : null,
          {
            backgroundColor: t.cardBg,
            borderColor: t.border,
            opacity: fade,
          },
          compact ? styles.cardCompact : styles.cardNormal,
          isActive ? styles.activeBorder : null,
        ]}
      >
        {isActive && <View pointerEvents="none" style={styles.activeGlow} />}

        {!compact && (
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: t.title }]}>Weather</Text>
            <View style={styles.right}>{rightSlot}</View>
          </View>
        )}

        {compact ? (
          <View style={styles.compactRow}>
            <View style={styles.leftBlock}>
              <Text
                style={[styles.city, styles.cityCompact, { color: t.city }]}
                numberOfLines={1}
              >
                {city}
              </Text>
              <Text
                style={[styles.summary, styles.summaryCompact, { color: t.summary }]}
                numberOfLines={1}
              >
                {weather}
              </Text>
            </View>

            <View style={styles.compactRight}>
              <Text style={[styles.icon, styles.iconCompact]}>{icon}</Text>
              <Text style={[styles.temp, styles.tempCompact, { color: t.city }]}>
                {temp === "--" ? "--" : `${temp}°C`}
              </Text>
              <View style={styles.right}>{rightSlot}</View>
            </View>
          </View>
        ) : (
          <View style={styles.mainRow}>
            <View style={styles.leftBlock}>
              <Text style={[styles.city, { color: t.city }]} numberOfLines={1}>
                {city}
              </Text>
              <Text style={[styles.summary, { color: t.summary }]} numberOfLines={1}>
                {weather}
              </Text>
            </View>

            <View style={styles.rightBlock}>
              <Text style={styles.icon}>{icon}</Text>
              <Text style={[styles.temp, { color: t.city }]}>
                {temp === "--" ? "--" : `${temp}°C`}
              </Text>
            </View>
          </View>
        )}

        {!!updatedAt && !compact && (
          <View style={[styles.chip, { backgroundColor: t.chipBg }]}>
            <Text style={[styles.chipText, { color: t.chipText }]}>
              Updated {updatedAt}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    width: "100%",
    maxWidth: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  cardNormal: {
    padding: 16,
    gap: 10,
  },
  cardCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  activeBorder: {
    borderWidth: 2,
    borderColor: "#22c55e",
  },
  activeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.5)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  right: { marginLeft: 10 },
  title: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  compactRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leftBlock: { flex: 1, minWidth: 0 },
  rightBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  city: { fontSize: 18, fontWeight: "900" },
  cityCompact: { fontSize: 16, fontWeight: "800" },
  summary: { fontSize: 13, fontWeight: "700" },
  summaryCompact: { fontSize: 12, fontWeight: "700" },
  icon: { fontSize: 22 },
  iconCompact: { fontSize: 18 },
  temp: { fontSize: 18, fontWeight: "900" },
  tempCompact: { fontSize: 16, fontWeight: "900" },
  chip: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: "800" },
});
