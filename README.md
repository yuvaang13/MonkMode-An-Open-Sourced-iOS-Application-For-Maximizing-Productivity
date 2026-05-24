# MonkMode App

MonkMode is an iOS-first focus app that helps you enforce deep work sessions with deliberate friction, Screen Time-based blocking, commitment rituals, and accountability tracking.

## Features

- Timed and multi-day focus sessions
- Guided iOS Screen Time setup (works without a paid Apple Developer account)
- Optional native Screen Time enforcement mode (FamilyControls/ManagedSettings)
- Recurring focus schedules
- Website blocklist / allowlist tools with share/export
- Session stats, streaks, and recovery missions
- Friend lock + accountability flows
- Optional outbound webhooks for session events
- One-time purchase unlock flow (RevenueCat)

## Project Status

- **Current app:** `monkmode/monkmode-v3/`
- **Legacy snapshot:** `monkmode/monkmode v2/`

## Tech Stack

- Expo SDK 51
- React Native 0.74
- TypeScript
- Zustand state management
- Native iOS modules (for Screen Time + device integrations)

## Repository Structure

- `monkmode/monkmode-v3/` — main app (active)
- `monkmode/monkmode v2/` — earlier version
- `LICENSE`

## Quick Start (v3)

1. Clone the repo: `git clone https://github.com/yuvaang13/MonkMode-app.git`
2. Open the app folder: `cd MonkMode-app/monkmode/monkmode-v3`
3. Install dependencies: `npm install`
4. Start Expo: `npm run start`
5. Run on iOS: `npm run ios`

## iOS Local Build Notes

- Install pods when needed: `cd ios && pod install`
- Open Xcode workspace: `open ios/MonkMode.xcworkspace`
- Set your signing team and run on a real device

## Available Scripts

- `npm run start`
- `npm run ios`
- `npm run android`
- `npm run build:ios`
- `npm run type-check`
- `npm run lint`

## Default Mode vs Native Screen Time Mode

By default, MonkMode uses a personal-team-friendly setup and guides users to configure Screen Time manually.

To enable native entitlement-based mode:

- Set `MONKMODE_NATIVE_SCREEN_TIME=1`
- Use the native profile in `eas.json`
- Ensure Apple entitlement approval for FamilyControls if required

## Documentation

- `monkmode/monkmode-v3/ARCHITECTURE.md`
- `monkmode/monkmode-v3/IOS_DEPLOYMENT.md`
- `monkmode/monkmode v2/ARCHITECTURE.md`

## Important Config Before Launch

Replace the placeholder RevenueCat key in:  
`monkmode/monkmode-v3/src/store/iapStore.ts`

## License

See `LICENSE` for license details.

## Developer Catch

If you are not signed up for an Apple developer account then this will not work on your phone, nor will you be able to publish it. 
