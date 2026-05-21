# iOS Personal Deployment

This is now the default build path for a normal Apple Account / Xcode Personal Team.

## What This Build Includes

- MonkMode timer and focus sessions
- Multi-day MonkMode sessions with daily check-ins
- Manual Screen Time setup guide
- Supervised iPhone / Apple Configurator guide
- Website block and allow lists with share/export
- Stats, recovery missions, friend lock, implementation intentions, and wallpaper flow

## What This Build Avoids

The default config does not request FamilyControls, ManagedSettings, App Groups, or DeviceActivity extensions. Those require a paid Apple Developer Program account and Apple-approved entitlements.

The full native Screen Time mode is still preserved behind:

```sh
MONKMODE_NATIVE_SCREEN_TIME=1
```

## Current Native Project

Expo generated:

```text
ios/MonkMode.xcodeproj
ios/Podfile
ios/MonkMode/Info.plist
ios/MonkMode/MonkMode.entitlements
```

The generated entitlements are Personal Team-friendly and do not include FamilyControls.

## Finish Local iOS Setup

Install CocoaPods, then install pods:

```sh
cd "/Users/Yuvi10/Desktop/DumbPhone VibeCode/monkmode v3/ios"
pod install
open MonkMode.xcworkspace
```

If `pod` is missing, install CocoaPods first. On newer macOS setups, the most reliable path is usually Homebrew:

```sh
brew install cocoapods
```

Then rerun `pod install`.

## Xcode Steps

1. Open `ios/MonkMode.xcworkspace` after pods are installed.
2. Select the `MonkMode` target.
3. Set Signing Team to your Personal Team.
4. Confirm Bundle Identifier is `com.yuvi10.monkmode`.
5. Connect your iPhone by USB.
6. Trust the Mac on the iPhone.
7. Select your iPhone as the run destination.
8. Build and run.

## In-App Setup

After install, open `CONFIG`:

- `Set up Screen Time` for manual app restrictions.
- `Website blocking lists` for domains to paste/share into filters.
- `Supervised iPhone setup` if you want the stronger Apple Configurator route.
