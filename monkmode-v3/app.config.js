const bundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER || 'com.yuvi10.monkmode'
const appGroup = process.env.IOS_APP_GROUP || 'group.com.yuvi10.monkmode'
const enableNativeScreenTime = process.env.MONKMODE_NATIVE_SCREEN_TIME === '1'

module.exports = {
  expo: {
    name: 'MonkMode',
    slug: 'monkmode',
    version: '1.0.0',
    scheme: 'monkmode',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    backgroundColor: '#0a0a0a',
    platforms: ['ios', 'web'],
    ios: {
      bundleIdentifier,
      buildNumber: '2',
      supportsTablet: false,
      deploymentTarget: '16.0',
      entitlements: enableNativeScreenTime
        ? {
            'com.apple.developer.family-controls': true,
            'com.apple.security.application-groups': [appGroup],
          }
        : {},
      infoPlist: {
        CFBundleDisplayName: 'MonkMode',
        LSApplicationQueriesSchemes: ['monkmode'],
        NSFaceIDUsageDescription: 'MonkMode uses Face ID to protect early-exit override controls.',
        NSPhotoLibraryAddUsageDescription: 'MonkMode saves generated focus wallpapers to your photo library when iOS requires manual wallpaper setup.',
        NSPhotoLibraryUsageDescription: 'MonkMode reads saved focus wallpapers so it can preview and restore your session visuals.',
        UIApplicationSupportsIndirectInputEvents: true,
        UIBackgroundModes: [],
        UIRequiredDeviceCapabilities: ['arm64'],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
        },
      },
    },
    plugins: [
      'expo-notifications',
      'expo-font',
    ],
    extra: {
      bundleIdentifier,
      appGroup,
      enableNativeScreenTime,
    },
  },
}
