# iOS Entitlements & Configuration Notes

## Required Entitlements (MonkMode.entitlements)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- CRITICAL: Required for FamilyControls / ManagedSettings access -->
    <!-- Must be requested from Apple via developer.apple.com — not auto-approved -->
    <!-- Use case: "Individual" (self-restriction, not parental control) -->
    <key>com.apple.developer.family-controls</key>
    <true/>

    <!-- App Groups: Shared UserDefaults between main app and Extensions -->
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.yourco.monkmode</string>
    </array>
</dict>
</plist>
```

## Required Entitlements (MonkMode Monitor Extension)
Same `family-controls` and `application-groups` as main target.

## Info.plist Additions

```xml
<!-- No network usage — declare this clearly -->
<!-- NSAppTransportSecurity not needed — zero outbound calls -->

<!-- Background Modes: DeviceActivity extension handles background work -->
<!-- No UIBackgroundModes needed in main app target -->

<!-- Privacy strings (required by App Store review) -->
<key>NSUserTrackingUsageDescription</key>
<string>MonkMode does not track you. This key is not used.</string>
```

## App Store Review Notes

When submitting, App Store review requires justification for the
`com.apple.developer.family-controls` entitlement. In your review notes:

  "MonkMode uses FamilyControls with .individual authorization to allow
   users to self-impose app restrictions during focus sessions. This is a
   personal productivity tool, not a parental control application. The user
   explicitly authorizes the app and sets their own whitelist."

Apple has approved similar apps (e.g. Opal, Freedom) under this entitlement.

## Minimum Deployment Target
iOS 16.0 (DeviceActivitySchedule with repeats:false requires 16+)
Xcode 15.0+, Swift 5.9+

## Extension Targets Required
1. DeviceActivity Monitor Extension
   - Bundle ID: com.yourco.monkmode.monitor
   - Principal class: MonkModeMonitor : DeviceActivityMonitor

2. Shield Configuration Extension  
   - Bundle ID: com.yourco.monkmode.shield
   - Principal class: MonkModeShieldConfiguration : ShieldConfigurationDataSource
