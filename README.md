# 🌤️ SkyScout – Cross-Platform Weather App

SkyScout is a polished, cross-platform weather application built with **Expo** and **React Native**, designed to run smoothly on **iOS** and the **web** from a single codebase.

The app focuses on real-world UX details such as haptics, sound feedback, drag-and-drop interactions, and clean, mobile-first UI design inspired by native iOS weather apps.

---

##  Features

-  **Location-aware weather**
  - Automatically detects the user’s current city
-  **Favourite cities**
  - Add, refresh, remove, and reorder cities
-  **Drag & drop reordering**
  - Smooth long-press interactions using gesture handling
-  **Sound feedback**
  - Subtle click sounds with user-controlled sound toggle
  - Works even when iOS device is in silent mode
-  **Haptic feedback**
  - Light, medium, and warning haptics for different actions
-  **Clean UI**
  - Compact, list-based layout optimised for mobile screens
  - Glow effects and animations clipped correctly within bounds
-  **Cross-platform**
  - Runs on iOS Simulator, physical iPhone, and web browser

---

##  Tech Stack

- **React Native** (0.81)
- **Expo SDK 54**
- **expo-audio** – sound effects & audio session handling
- **expo-haptics** – tactile feedback
- **expo-location** – current location detection
- **react-native-draggable-flatlist** – drag & drop favourites
- **Open-Meteo API** – weather & geocoding data

---

##  Getting Started

###  Install dependencies

```bash
npm install
```
##  Run on iOS (recommended)

Requires Xcode and iOS Simulator (macOS)

```
npx expo run:ios
```
This uses an Expo development build, which is required for native features such as:
	•	Audio
	•	Haptics
	•	Gesture handling

##  Run on Web
```
npm start
```
Then press w in the Expo CLI, or open:
```
http://localhost:8081
```
note: Some native effects (haptics, drag physics) are simplified on web.

##  Sound & Haptics
	•	Sound effects are enabled by default
	•	Users can toggle sound on/off via the switch in the app header
	•	iOS audio is configured to:
	•	Play in silent mode
	•	Mix with other audio
	•	Avoid dropped or missed sound playback

This behaviour was intentionally engineered to handle common iOS audio edge cases.

##  Project Structure
```
weather-app/
├── App.jsx
├── components/
│   ├── City.jsx
│   └── Weather.jsx
├── assets/
│   └── sounds/
│       └── sci-fi-click-900.wav
├── package.json
├── app.json
└── README.md
```
##  Design Decisions

	•	Single codebase for iOS and web
	•	Explicit audio serialisation to ensure reliable playback on iOS
	•	Clipped list containers to prevent glow/drag overflow
	•	Compact list layout to maximise visible content on small screens
	•	Clear separation of concerns between UI components and app logic

##  Possible Future Improvements

	•	Persist favourites using AsyncStorage
	•	Add hourly / daily forecasts
	•	Dark / light theme toggle
	•	Offline caching
	•	App Store / TestFlight deployment

##  About the Project 
SkyScout was built as a portfolio project to demonstrate practical skills in:

	•	Mobile UI/UX
	•	Cross-platform development
	•	Native device features
	•	Debugging real-world platform quirks (especially iOS audio)

It reflects how modern software engineers work today — iterating quickly, testing on real devices, and focusing on user experience details.

##  License

This project is licensed under the MIT License.  
You are free to use, modify, and distribute this project for personal or educational purposes.


