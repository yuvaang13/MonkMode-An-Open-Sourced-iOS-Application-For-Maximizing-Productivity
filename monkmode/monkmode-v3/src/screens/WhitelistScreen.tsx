/**
 * screens/WhitelistScreen.tsx
 *
 * App whitelist editor. Two entry points:
 *   1. "Select Apps" — opens FamilyActivityPicker system sheet
 *   2. "Manage Presets" — save/load whitelist presets
 *
 * The app list itself is rendered from whitelistStore.installedApps
 * which are populated after the user makes a selection in the picker.
 */

import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native'
import { NativeModules } from 'react-native'
import { useWhitelistStore, AppEntry } from '../store/whitelistStore'
import { Colors, T, S } from '../utils/styles'

const { AppInventoryModule } = NativeModules

export const WhitelistScreen: React.FC = () => {
  const {
    installedApps, allowedTokens,
    setInstalledApps, toggleApp,
    presets, savePreset, loadPreset,
  } = useWhitelistStore()

  const [loading, setLoading] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  const allowedCount = allowedTokens.size
  const blockedCount = installedApps.length - allowedCount

  const openPicker = async () => {
    setLoading(true)
    try {
      const currentTokens = Array.from(allowedTokens)
      const apps: Array<{ token: string; displayName: string; bundleCategory: string }> =
        await AppInventoryModule.presentAppPicker(currentTokens)

      // Merge with existing list — picker returns full selection
      const merged: AppEntry[] = apps.map(a => ({
        token: a.token,
        displayName: a.displayName,
        bundleCategory: a.bundleCategory,
      }))
      setInstalledApps(merged)

      // The picker selection IS the whitelist — mark all returned tokens as allowed
      const newAllowed = new Set(apps.map(a => a.token))
      // Update store by calling allowOnly
      useWhitelistStore.getState().allowOnly(Array.from(newAllowed))
    } catch (e) {
      Alert.alert('Error', 'Could not open app picker. Ensure FamilyControls is authorized.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreset = () => {
    Alert.prompt(
      'SAVE PRESET',
      'Name this whitelist configuration.',
      name => { if (name?.trim()) savePreset(name.trim()) },
      'plain-text',
      '',
      'default'
    )
  }

  const categories = Array.from(
    new Set(installedApps.map(a => a.bundleCategory))
  )

  return (
    <View style={S.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>WHITELIST.</Text>
        <Text style={styles.pageSubtitle}>
          {allowedCount} ALLOWED · {blockedCount} BLOCKED
        </Text>

        {/* Primary action */}
        <TouchableOpacity
          style={S.primaryBtn}
          onPress={openPicker}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={S.primaryBtnText}>
            {loading ? 'OPENING...' : 'SELECT APPS →'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.pickerNote}>
          Uses iOS FamilyActivityPicker. MonkMode never reads app names directly — only opaque system tokens.
        </Text>

        {/* Current selection */}
        {installedApps.length > 0 && (
          <>
            <View style={S.divider} />
            <Text style={S.sectionLabel}>CURRENT SELECTION</Text>

            {categories.map(cat => {
              const apps = installedApps.filter(a => a.bundleCategory === cat)
              return (
                <View key={cat}>
                  <Text style={styles.catLabel}>{cat.toUpperCase()}</Text>
                  {apps.map(app => (
                    <TouchableOpacity
                      key={app.token}
                      style={styles.appRow}
                      onPress={() => toggleApp(app.token)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.appIconMock}>
                        <Text style={styles.appIconText}>
                          {app.displayName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.appName,
                        !allowedTokens.has(app.token) && styles.appNameDimmed,
                      ]}>
                        {app.displayName}
                      </Text>
                      <View style={[
                        styles.checkbox,
                        allowedTokens.has(app.token) && styles.checkboxChecked,
                      ]}>
                        {allowedTokens.has(app.token) && <View style={styles.checkmark} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            })}
          </>
        )}

        {/* Presets */}
        <View style={S.divider} />
        <View style={styles.presetsHeader}>
          <Text style={S.sectionLabel}>PRESETS</Text>
          <TouchableOpacity onPress={handleSavePreset}>
            <Text style={styles.savePreset}>SAVE CURRENT →</Text>
          </TouchableOpacity>
        </View>

        {presets.map(preset => (
          <TouchableOpacity
            key={preset.id}
            style={styles.presetRow}
            onPress={() => loadPreset(preset.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.presetName}>{preset.name.toUpperCase()}</Text>
            <Text style={styles.presetCount}>{preset.tokens.length} APPS</Text>
          </TouchableOpacity>
        ))}

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 14,
  },
  pageTitle: {
    ...T.display,
    fontSize: 56,
    lineHeight: 52,
    marginBottom: 4,
  },
  pageSubtitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pickerNote: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textDim,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  catLabel: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 3,
    textTransform: 'uppercase',
    paddingVertical: 8,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  appIconMock: {
    width: 32, height: 32, borderRadius: 7,
    backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  appIconText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
  },
  appName: {
    ...T.sans,
    fontSize: 13,
    color: Colors.textBody,
    flex: 1,
    fontWeight: '300',
  },
  appNameDimmed: {
    color: Colors.textMid,
  },
  checkbox: {
    width: 22, height: 22,
    borderWidth: 1, borderColor: Colors.borderMid,
    borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.textHi,
    borderColor: Colors.textHi,
  },
  checkmark: {
    width: 10, height: 6,
    borderLeftWidth: 1.5, borderBottomWidth: 1.5,
    borderColor: Colors.bg,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  presetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savePreset: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  presetName: {
    ...T.display,
    fontSize: 16,
    letterSpacing: 2,
  },
  presetCount: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1,
  },
})
