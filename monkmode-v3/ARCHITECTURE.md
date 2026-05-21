# MONK MODE — Architecture & Concept Document

## Overview

MonkMode transforms an iPhone into a single-purpose focus device by leveraging Apple's
`FamilyControls` / `ManagedSettings` / `DeviceActivity` frameworks — the same stack used
by Screen Time — without ever storing or reading a Screen Time passcode (which Apple's
Secure Enclave makes inaccessible to third-party apps by design).

The app enforces a user-defined whitelist at the OS level: blocked apps are intercepted
by iOS itself before they launch, showing a system-native "Screen Time" restriction screen.
No jailbreak. No MDM. Just the official APIs, used as Apple intended for self-restriction.

---

## iOS API Stack

### FamilyControls (iOS 15+)
- Entitlement: `com.apple.developer.family-controls`
- Usage: `AuthorizationCenter.shared.requestAuthorization(for: .individual)`
- One-time user consent grants the app permission to apply ManagedSettings restrictions
- The `.individual` mode means the user is restricting themselves (not a child device)

### ManagedSettings (iOS 15+)
- `ManagedSettingsStore` — the live restriction state container
- `store.application.blockedApplications = Set<ApplicationToken>`
- `ApplicationToken` objects are opaque handles obtained from `FamilyActivityPicker`
- Setting this property immediately enforces blocks at the OS kernel level
- Clearing it: `store.clearAllSettings()`

### DeviceActivity (iOS 15+)
- `DeviceActivitySchedule` — defines a time window for enforcement
- `DeviceActivityMonitor` — App Extension that fires callbacks at window start/end
- Critical: the Monitor Extension runs in its own process. Enforcement continues even
  if the main MonkMode app is killed, backgrounded, or force-quit by the user

### FamilyActivityPicker (SwiftUI)
- System sheet that lists installed apps with their opaque tokens
- User selects which apps — MonkMode never sees bundle IDs, only tokens
- Tokens are stored encrypted on-device and passed to ManagedSettingsStore

---

## Restriction Flow (not "passcode access")

```
User taps "Begin Session"
  → JS calls ScreenTimeModule.applyRestrictions(sessionConfig)
  → Swift reads stored ApplicationToken[] from Keychain
  → ManagedSettingsStore().application.blockedApplications = tokens NOT in whitelist
  → DeviceActivityCenter.shared.startMonitoring(schedule)
  → iOS enforces: any blocked app shows system "Screen Time" block screen
  → DeviceActivityMonitor extension fires intervalDidEnd to clear restrictions
```

There is NO Screen Time passcode involvement. The app sets its OWN restrictions
using its own ManagedSettingsStore — separate from the user's personal Screen Time.

---

## Override / "Unlock Early" Mechanism

Instead of reading a Screen Time passcode (impossible), MonkMode uses its own
4-digit override passcode stored in the iOS Keychain:

```swift
// Storing override passcode
let query: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrAccount as String: "monk_override_passcode",
  kSecValueData as String: hashedPin.data(using: .utf8)!,
  kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
]
SecItemAdd(query as CFDictionary, nil)
```

To end a session early, the user must enter this passcode. The app can also
optionally add a 60-second cooldown after passcode entry before restrictions clear,
making impulsive overrides less rewarding.

---

## Project Structure

```
monkmode/
├── src/
│   ├── screens/
│   │   ├── OnboardingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── WhitelistScreen.tsx
│   │   ├── FocusActiveScreen.tsx
│   │   ├── BlockedInterceptScreen.tsx  (via Notification Extension)
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── AppRow.tsx
│   │   ├── FocusRing.tsx
│   │   ├── MonoText.tsx
│   │   └── OverrideModal.tsx
│   ├── native/
│   │   ├── ScreenTimeModule.ts         (JS interface to TurboModule)
│   │   ├── AppInventoryModule.ts
│   │   └── DeviceActivityModule.ts
│   ├── store/
│   │   ├── sessionStore.ts             (Zustand)
│   │   └── whitelistStore.ts
│   ├── hooks/
│   │   ├── useSessionTimer.ts
│   │   └── useFocusEnforcement.ts
│   └── utils/
│       ├── keychain.ts
│       └── sessionLogger.ts
├── ios/
│   └── MonkMode/
│       ├── NativeModules/
│       │   ├── ScreenTimeModule.swift
│       │   ├── AppInventoryModule.swift
│       │   └── DeviceActivityModule.swift
│       └── Extensions/
│           ├── DeviceActivityMonitorExtension.swift
│           └── ShieldConfigurationExtension.swift
├── ARCHITECTURE.md
├── package.json
└── app.json
```

---

## Design Principles

1. **Deliberate Ugliness** — The UI is stark B&W by design. No color = no dopamine hit.
   Even the app icon is a plain white circle on black. Looking at the app should feel
   like looking at a utility, not entertainment.

2. **Friction by Design** — Starting a session is one tap. Ending early requires
   a 4-digit code + 60-second wait. Asymmetric friction.

3. **Zero Network** — No analytics, no accounts, no sync. All data stays on-device.
   The app requests no network entitlement in its Info.plist.

4. **Extension-Enforced** — Restrictions live in a DeviceActivity Extension process.
   The user cannot "just delete the app" to escape — ManagedSettings persists until
   explicitly cleared by the extension at session end.

5. **Typography as Friction** — Bebas Neue for display, DM Mono for body. Monospaced
   text is harder to skim, slower to read — intentional cognitive friction.
