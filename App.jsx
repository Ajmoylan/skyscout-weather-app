import {
  StyleSheet,
  View,
  Platform,
  StatusBar,
  Text,
  TextInput,
  Pressable,
  Switch,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import DraggableFlatList from "react-native-draggable-flatlist";

import Weather from "./components/Weather";
import City from "./components/City";

import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

/** ---------- Helpers ---------- */

function codeToSummary(code) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
}

function timeHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

async function fetchCurrentWeather(lat, lon, signal) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code` +
    `&temperature_unit=celsius`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = await res.json();

  const t = data?.current?.temperature_2m;
  const code = data?.current?.weather_code;

  return {
    temp: typeof t === "number" ? Math.round(t) : "--",
    weather: codeToSummary(code),
    updatedAt: timeHHMM(),
  };
}

async function cityToCoords(cityName, signal) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(cityName)}` +
    `&count=1&language=en&format=json`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`City lookup failed (${res.status})`);
  const data = await res.json();

  const r = data?.results?.[0];
  if (!r) throw new Error("City not found");
  return { latitude: r.latitude, longitude: r.longitude, label: r.name };
}

/** ---------- App ---------- */

function AppContent() {
  /** ---- Haptics ---- */
  const hapticTap = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const hapticDrag = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const hapticDelete = () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  /** ---- Click sound (expo-audio) ---- */
  const clickPlayer = useAudioPlayer(
    require("./assets/sounds/sci-fi-click-900.wav"),
    { downloadFirst: true, keepAudioSessionActive: true }
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    try {
      const vol =
        Platform.OS === "ios" ? 0.10 : Platform.OS === "android" ? 0.18 : 0.35;
      clickPlayer.volume = vol;
    } catch {}
  }, [clickPlayer]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  // Serialise plays so iOS never “drops” them.
  const playChainRef = useRef(Promise.resolve());
  const playClick = () => {
    if (!soundEnabledRef.current) return;
    playChainRef.current = playChainRef.current
      .catch(() => {})
      .then(async () => {
        try {
          if (!soundEnabledRef.current) return;
          if (!clickPlayer.isLoaded) {
            await new Promise((r) => setTimeout(r, 24));
          }
          if (!clickPlayer.isLoaded) return;
          clickPlayer.pause?.();
          await clickPlayer.seekTo?.(0);
          await new Promise((r) => setTimeout(r, 0));
          clickPlayer.play?.();
        } catch {}
      });
  };

  /** ---- Current location card ---- */
  const [myCity, setMyCity] = useState("Finding city...");
  const [coords, setCoords] = useState(null);
  const [myTemp, setMyTemp] = useState("--");
  const [myWeather, setMyWeather] = useState("Loading...");
  const [myUpdatedAt, setMyUpdatedAt] = useState(null);
  const [myError, setMyError] = useState(null);

  /** ---- Favourites ---- */
  const [favs, setFavs] = useState([]);
  const [query, setQuery] = useState("");

  const lastMyFetchKeyRef = useRef(null);

  const onCityChange = useCallback((label) => setMyCity(label), []);
  const onCoordsChange = useCallback(
    (c) => setCoords({ latitude: c.latitude, longitude: c.longitude }),
    []
  );

  useEffect(() => {
    if (!coords) return;

    const key = `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
    if (lastMyFetchKeyRef.current === key) return;
    lastMyFetchKeyRef.current = key;

    const controller = new AbortController();

    (async () => {
      try {
        setMyError(null);
        setMyWeather("Loading...");
        setMyTemp("--");
        setMyUpdatedAt(null);

        const w = await fetchCurrentWeather(
          coords.latitude,
          coords.longitude,
          controller.signal
        );
        setMyWeather(w.weather);
        setMyTemp(w.temp);
        setMyUpdatedAt(w.updatedAt);
      } catch (e) {
        if (e.name === "AbortError") return;
        setMyError(e.message);
        setMyWeather("Unknown");
        setMyTemp("--");
        setMyUpdatedAt(null);
      }
    })();

    return () => controller.abort();
  }, [coords]);

  const presets = useMemo(() => ["Oslo", "London", "Bergen", "Trondheim", "Cardiff"], []);

  async function addFavourite(rawName) {
    const cityName = rawName.trim();
    if (!cityName) return;

    const exists = favs.some((f) => f.label.toLowerCase() === cityName.toLowerCase());
    if (exists) {
      setQuery("");
      return;
    }

    const controller = new AbortController();

    try {
      const { latitude, longitude, label } = await cityToCoords(cityName, controller.signal);

      const id = `${label}-${Date.now()}`;
      setFavs((prev) => [
        {
          id,
          label,
          latitude,
          longitude,
          temp: "--",
          weather: "Loading...",
          updatedAt: null,
          error: null,
        },
        ...prev,
      ]);

      const w = await fetchCurrentWeather(latitude, longitude, controller.signal);
      setFavs((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, temp: w.temp, weather: w.weather, updatedAt: w.updatedAt } : f
        )
      );

      setQuery("");
    } catch (e) {
      const id = `error-${Date.now()}`;
      setFavs((prev) => [
        {
          id,
          label: cityName,
          latitude: null,
          longitude: null,
          temp: "--",
          weather: "Unknown",
          updatedAt: null,
          error:
            "Couldn’t look up this city (web may block by CORS). Try on iPhone or use a preset.",
        },
        ...prev,
      ]);
    }
  }

  async function refreshFavourite(id) {
    const fav = favs.find((f) => f.id === id);
    if (!fav || fav.latitude == null || fav.longitude == null) return;

    const controller = new AbortController();

    setFavs((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, temp: "--", weather: "Loading...", error: null } : f
      )
    );

    try {
      const w = await fetchCurrentWeather(fav.latitude, fav.longitude, controller.signal);
      setFavs((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, temp: w.temp, weather: w.weather, updatedAt: w.updatedAt } : f
        )
      );
    } catch (e) {
      setFavs((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, temp: "--", weather: "Unknown", error: e.message } : f
        )
      );
    }
  }

  function removeFavourite(id) {
    setFavs((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.h1}>SkyScout</Text>
            <View style={styles.soundToggle}>
              <Text style={styles.soundLabel}>
                {soundEnabled ? "Sound On" : "Sound Off"}
              </Text>
              <Switch
                value={soundEnabled}
                onValueChange={(val) => {
                  setSoundEnabled(val);
                  hapticTap();
                }}
                trackColor={{ false: "#1f2937", true: "#22c55e" }}
                ios_backgroundColor="#1f2937"
              />
            </View>
          </View>
          <Text style={styles.h2}>Location-aware weather • Favourites • Drag to reorder</Text>
        </View>

        {/* Current location */}
        <City onCityChange={onCityChange} onCoordsChange={onCoordsChange} />
        {myError && <Text style={styles.error}>{myError}</Text>}

        <Weather
          city={myCity}
          weather={myWeather}
          temp={myTemp}
          theme="light"
          updatedAt={myUpdatedAt}
          onPressIn={() => {
            // optional click on tapping current weather card
            playClick();
            hapticTap();
          }}
        />

        {/* Add favourites */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorTitle}>Favourites</Text>

          <View style={styles.inputRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Add a city (e.g., Oslo)"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Pressable
              style={[styles.button, !query.trim() && styles.buttonDisabled]}
              disabled={!query.trim()}
              onPressIn={() => {
                playClick();
                hapticTap();
              }}
              onPress={() => {
                // tiny delay makes iOS audio start reliably before re-render / network kicks in
                setTimeout(() => addFavourite(query), 0);
              }}
            >
              <Text style={styles.buttonText}>Add</Text>
            </Pressable>
          </View>

          <View style={styles.presetRow}>
            {presets.map((c) => (
              <Pressable
                key={c}
                style={styles.preset}
                onPressIn={() => {
                  playClick();
                  hapticTap();
                }}
                onPress={() => setTimeout(() => addFavourite(c), 0)}
              >
                <Text style={styles.presetText}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.help}>Tip: long-press a favourite row to drag and reorder.</Text>
        </View>

        {/* List */}
        {favs.length === 0 ? (
          <Text style={styles.empty}>No favourites yet — add a city above.</Text>
        ) : (
          <View style={styles.listOuter}>
            <View style={styles.listClip}>
              <DraggableFlatList
                data={favs}
                keyExtractor={(item) => item.id}
                activationDistance={12}
                dragItemOverflow={false}
                contentContainerStyle={styles.listContent}
                onDragEnd={({ data }) => {
                  setFavs(data);
                  playClick();
                  hapticTap();
                }}
                renderItem={({ item, drag, isActive }) => (
                  <View style={styles.itemWrap}>
                    <Weather
                      variant="compact"
                      city={item.label}
                      weather={item.error ? item.error : item.weather}
                      temp={item.temp}
                      theme="dark"
                      updatedAt={item.updatedAt}
                      isActive={isActive}
                      rightSlot={
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            style={styles.smallBtn}
                            onPressIn={() => {
                              playClick();
                              hapticTap();
                            }}
                            onPress={() => refreshFavourite(item.id)}
                          >
                            <Text style={styles.smallBtnText}>↻</Text>
                          </Pressable>

                          <Pressable
                            style={[styles.smallBtn, styles.smallBtnDanger]}
                            onPressIn={() => {
                              playClick();
                              hapticDelete();
                            }}
                            onPress={() => removeFavourite(item.id)}
                          >
                            <Text style={styles.smallBtnText}>✕</Text>
                          </Pressable>
                        </View>
                      }
                    />

                    {/* Long-press drag handle (leaves room for action buttons) */}
                    <Pressable
                      style={styles.dragHandle}
                      onPressIn={() => {
                        playClick();
                        hapticTap();
                      }}
                      onLongPress={() => {
                        // Reliable: trigger sound + haptic at drag start
                        playClick();
                        hapticDrag();
                        drag();
                      }}
                      delayLongPress={220}
                    />
                  </View>
                )}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1220" },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 14,
    ...(Platform.OS === "android"
      ? { paddingTop: (StatusBar.currentHeight || 0) + 8 }
      : null),
  },

  header: { gap: 6, marginBottom: 6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  h1: { fontSize: 34, fontWeight: "900", color: "#60a5fa" },
  h2: { fontSize: 13, fontWeight: "700", color: "#a7f3d0" },
  soundToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#0b1020",
  },
  soundLabel: { color: "#e2e8f0", fontSize: 12, fontWeight: "800" },

  selectorCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    gap: 10,
  },
  selectorTitle: { color: "#e2e8f0", fontSize: 16, fontWeight: "900" },

  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e2e8f0",
  },
  button: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#0b1020", fontWeight: "900" },

  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: {
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  presetText: { color: "#e2e8f0", fontWeight: "800", fontSize: 12 },

  help: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },

  empty: { color: "#94a3b8", fontWeight: "700" },
  error: { color: "#fecaca", fontWeight: "800" },

  /** List border + clipping so NOTHING can render outside */
  listOuter: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  listClip: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    padding: 8,
  },
  listContent: {
    paddingBottom: 12,
    gap: 8,
  },

  itemWrap: {
    width: "100%",
    alignSelf: "stretch",
    position: "relative",
  },
  dragHandle: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 96,
  },

  smallBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0b1020",
  },
  smallBtnDanger: { borderColor: "#7f1d1d" },
  smallBtnText: { color: "#e2e8f0", fontWeight: "900" },
});
