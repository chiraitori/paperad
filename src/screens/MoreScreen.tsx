import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../types';

export const MoreScreen: React.FC = () => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ];

  const renderSettingItem = (
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={onPress === undefined}
    >
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={[styles.appIcon, { backgroundColor: theme.primary }]}>
            <Text style={styles.appIconText}>📚</Text>
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Paperand</Text>
          <Text style={[styles.appVersion, { color: theme.textSecondary }]}>
            Version {Constants.expoConfig?.version || '0.0.3-rc'}
          </Text>
          <Text style={[styles.appTagline, { color: theme.textSecondary }]}>
            Ad-free Manga Reader
          </Text>
        </View>

        {/* Theme Settings */}
        {renderSection(
          'APPEARANCE',
          <>
            <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Theme</Text>
              <View style={styles.themeOptions}>
                {themeOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.themeButton,
                      themeMode === option.key
                        ? { backgroundColor: theme.primary }
                        : { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 },
                    ]}
                    onPress={() => setThemeMode(option.key)}
                  >
                    <Text
                      style={[
                        styles.themeButtonText,
                        { color: themeMode === option.key ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Reading Settings */}
        {renderSection(
          'READING',
          <>
            {renderSettingItem(
              'Default Reading Mode',
              'Vertical scrolling',
            )}
            {renderSettingItem(
              'Keep Screen On While Reading',
              undefined,
              undefined,
              <Switch
                value={true}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            )}
            {renderSettingItem(
              'Auto-Advance Chapters',
              undefined,
              undefined,
              <Switch
                value={false}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            )}
          </>
        )}

        {/* Storage */}
        {renderSection(
          'STORAGE',
          <>
            {renderSettingItem(
              'Clear Image Cache',
              'Free up storage space',
              () => {},
            )}
            {renderSettingItem(
              'Downloads',
              '0 MB',
            )}
          </>
        )}

        {/* About */}
        {renderSection(
          'ABOUT',
          <>
            {renderSettingItem(
              'GitHub Repository',
              'View source code',
              () => Linking.openURL('https://github.com'),
            )}
            {renderSettingItem(
              'Report an Issue',
              'Help us improve',
              () => Linking.openURL('https://github.com'),
            )}
            {renderSettingItem(
              'Privacy Policy',
              undefined,
              () => {},
            )}
            {renderSettingItem(
              'Terms of Service',
              undefined,
              () => {},
            )}
          </>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Made with ❤️ for manga lovers
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            No ads. No tracking. Just manga.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appIconText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  appVersion: {
    fontSize: 14,
    marginTop: 4,
  },
  appTagline: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 100,
  },
  footerText: {
    fontSize: 14,
    marginVertical: 4,
  },
});
