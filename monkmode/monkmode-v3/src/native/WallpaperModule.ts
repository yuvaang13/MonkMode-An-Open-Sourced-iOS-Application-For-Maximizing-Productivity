/**
 * native/WallpaperModule.ts
 *
 * JS interface for the WallpaperModule TurboModule.
 * Sets/restores the device wallpaper on session start/end.
 *
 * Two modes depending on iOS availability:
 *   - "programmatic": wallpaper set silently in background
 *   - "photos_fallback": image saved to Camera Roll, user taps to set
 */

import { NativeModules, Platform } from 'react-native'

const { WallpaperModule: Native } = NativeModules

export type SetWallpaperResult =
  | { method: 'programmatic'; saved: boolean }
  | { method: 'photos_fallback'; saved: boolean; message: string }

export const WallpaperModule = {
  /**
   * Render and apply the MonkMode wallpaper.
   * Call on session start. Returns which method was used.
   */
  setMonkModeWallpaper(): Promise<SetWallpaperResult> {
    if (Platform.OS !== 'ios' || !Native) {
      return Promise.resolve({ method: 'programmatic', saved: false })
    }
    return Native.setMonkModeWallpaper()
  },

  /**
   * Restore the user's original wallpaper.
   * Call on session end.
   */
  restoreOriginalWallpaper(): Promise<{ restored: boolean }> {
    if (Platform.OS !== 'ios' || !Native) {
      return Promise.resolve({ restored: false })
    }
    return Native.restoreOriginalWallpaper()
  },

  /**
   * Get the file path of the generated wallpaper (for preview in UI).
   */
  getWallpaperPath(): Promise<{ path: string | null; exists: boolean }> {
    if (Platform.OS !== 'ios' || !Native) {
      return Promise.resolve({ path: null, exists: false })
    }
    return Native.getWallpaperPath()
  },
}
