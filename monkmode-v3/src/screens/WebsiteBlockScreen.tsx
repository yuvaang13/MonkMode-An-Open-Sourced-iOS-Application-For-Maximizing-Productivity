import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Share,
} from 'react-native'
import { useWebsiteBlockStore } from '../store/websiteBlockStore'
import { Colors, T, S } from '../utils/styles'

interface Props {
  onBack: () => void
}

export const WebsiteBlockScreen: React.FC<Props> = ({ onBack }) => {
  const {
    mode, blockedDomains, allowedDomains, presets,
    setMode, addBlockedDomain, removeBlockedDomain,
    addAllowedDomain, removeAllowedDomain, loadPreset, exportList,
  } = useWebsiteBlockStore()
  const [domain, setDomain] = useState('')

  const activeList = mode === 'blocklist' ? blockedDomains : allowedDomains
  const addDomain = () => {
    if (mode === 'blocklist') addBlockedDomain(domain)
    else addAllowedDomain(domain)
    setDomain('')
  }
  const removeDomain = (value: string) => {
    if (mode === 'blocklist') removeBlockedDomain(value)
    else removeAllowedDomain(value)
  }

  const shareList = async () => {
    const title = mode === 'blocklist' ? 'MonkMode website blocklist' : 'MonkMode website allowlist'
    await Share.share({
      title,
      message: `${title}\n\n${exportList()}`,
    })
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={styles.backText}>← CONFIG</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>WEB.</Text>
      <Text style={styles.pageSubtitle}>WEBSITE-ONLY BLOCKING LISTS.</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'blocklist' && styles.modeBtnActive]}
          onPress={() => setMode('blocklist')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeText, mode === 'blocklist' && styles.modeTextActive]}>BLOCK</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'allowlist' && styles.modeBtnActive]}
          onPress={() => setMode('allowlist')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeText, mode === 'allowlist' && styles.modeTextActive]}>ALLOW ONLY</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>USE THIS ON YOUR IPHONE</Text>
        <Text style={styles.setupBody}>
          Copy or share this list into Screen Time Content Restrictions, a DNS blocker, VPN blocker, or an Apple Configurator web content profile.
        </Text>
      </View>

      {mode === 'blocklist' && (
        <>
          <Text style={S.sectionLabel}>PRESETS</Text>
          <View style={styles.presetRow}>
            {presets.map(preset => (
              <TouchableOpacity
                key={preset.id}
                style={styles.preset}
                onPress={() => loadPreset(preset.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>{preset.name.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={S.sectionLabel}>{mode === 'blocklist' ? 'BLOCKED DOMAINS' : 'ALLOWED DOMAINS'}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={domain}
          onChangeText={setDomain}
          placeholder="example.com"
          placeholderTextColor={Colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={addDomain}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addDomain} activeOpacity={0.7}>
          <Text style={styles.addText}>ADD</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.domainList}>
        {activeList.map(item => (
          <TouchableOpacity
            key={item}
            style={styles.domainRow}
            onPress={() => removeDomain(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.domainText}>{item}</Text>
            <Text style={styles.removeText}>REMOVE</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={S.primaryBtn} onPress={shareList} activeOpacity={0.7}>
        <Text style={S.primaryBtnText}>SHARE LIST →</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 14,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 2,
  },
  pageTitle: {
    ...T.display,
    fontSize: 56,
    lineHeight: 52,
  },
  pageSubtitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 3,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modeBtnActive: {
    borderColor: Colors.borderHi,
    backgroundColor: Colors.bgCard,
  },
  modeText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 1.2,
  },
  modeTextActive: {
    color: Colors.textHi,
  },
  setupCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 14,
    gap: 8,
  },
  setupTitle: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textHi,
    letterSpacing: 1.5,
  },
  setupBody: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textSub,
    lineHeight: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textMid,
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    ...T.mono,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    color: Colors.textHi,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
  },
  addBtn: {
    width: 64,
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    ...T.mono,
    fontSize: 9,
    color: Colors.textHi,
    letterSpacing: 1,
  },
  domainList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  domainText: {
    ...T.mono,
    fontSize: 11,
    color: Colors.textBody,
  },
  removeText: {
    ...T.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1,
  },
})
