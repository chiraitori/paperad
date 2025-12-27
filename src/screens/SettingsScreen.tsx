import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { getImageCacheSize, formatCacheSize, clearImageCache, getCacheLimit, setCacheLimit, CACHE_LIMIT_OPTIONS, CacheLimitOption } from '../services/cacheService';
import { PickerModal } from '../components';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import { t, getCurrentLanguage, setLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../services/i18nService';

export const SettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { clearHistory } = useLibrary();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hideReadHistory, setHideReadHistory] = useState(false);
  const [errorPopups, setErrorPopups] = useState(true);
  const [cacheSize, setCacheSize] = useState<string>(t('common.loading'));
  const [isClearing, setIsClearing] = useState(false);
  const [cacheLimit, setCacheLimitState] = useState<CacheLimitOption>('500MB');
  const [showCachePicker, setShowCachePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());

  const loadCacheSize = useCallback(async () => {
    const size = await getImageCacheSize();
    setCacheSize(formatCacheSize(size));
  }, []);

  const loadCacheLimit = useCallback(async () => {
    const limit = await getCacheLimit();
    setCacheLimitState(limit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCacheSize();
      loadCacheLimit();
      setCurrentLang(getCurrentLanguage());
    }, [loadCacheSize, loadCacheLimit])
  );

  const handleCacheLimitChange = () => {
    const options: CacheLimitOption[] = ['No Cache', '300MB', '500MB', '1GB', '3GB', '5GB', '10GB'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, t('common.cancel')],
          cancelButtonIndex: options.length,
          title: t('settings.imageCacheSize'),
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            const selected = options[buttonIndex];
            setCacheLimitState(selected);
            setCacheLimit(selected);
          }
        }
      );
    } else {
      setShowCachePicker(true);
    }
  };

  const handleCacheLimitSelect = (option: CacheLimitOption) => {
    setCacheLimitState(option);
    setCacheLimit(option);
  };

  const handleLanguageChange = () => {
    const langCodes = Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[];
    const options = langCodes.map(code => SUPPORTED_LANGUAGES[code].nativeName);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, t('common.cancel')],
          cancelButtonIndex: options.length,
          title: t('settings.language'),
        },
        (buttonIndex) => {
          if (buttonIndex < langCodes.length) {
            handleLanguageSelect(langCodes[buttonIndex]);
          }
        }
      );
    } else {
      setShowLanguagePicker(true);
    }
  };

  const handleLanguageSelect = async (langCode: LanguageCode) => {
    await setLanguage(langCode);
    setCurrentLang(langCode);
    // Force re-render by navigating away and back, or show alert
    Alert.alert(
      t('settings.languageChanged'),
      t('settings.restartRequired'),
      [{ text: t('common.ok') }]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      t('settings.clearImageCache'),
      t('settings.clearCacheConfirm', { size: cacheSize }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            const success = await clearImageCache();
            setIsClearing(false);
            if (success) {
              setCacheSize('0 B');
              Alert.alert(t('common.success'), t('settings.cacheClearedSuccess'));
            } else {
              Alert.alert(t('common.error'), t('settings.cacheClearFailed'));
            }
            loadCacheSize();
          },
        },
      ]
    );
  };

  const renderSettingItem = ({
    title,
    subtitle,
    onPress,
    rightElement,
    isDestructive = false,
    showChevron = true,
    value,
  }: {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    isDestructive?: boolean;
    showChevron?: boolean;
    value?: string;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={onPress === undefined && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingContent}>
        <Text
          style={[
            styles.settingTitle,
            { color: isDestructive ? theme.error : theme.text },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.rightContainer}>
        {value && (
          <Text style={[styles.valueText, { color: theme.textSecondary }]}>
            {value}
          </Text>
        )}
        {rightElement}
        {showChevron && onPress && !rightElement && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string | null, children: React.ReactNode) => (
    <View style={styles.section}>
      {title && (
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {title}
        </Text>
      )}
      <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );

  const languageOptions = Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => ({
    value: code,
    label: lang.nativeName,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Login */}
        {renderSection(
          null,
          renderSettingItem({
            title: t('settings.loginToPaperand'),
            onPress: () => Alert.alert(t('settings.login'), t('settings.loginNotImplemented')),
            showChevron: false,
          })
        )}

        {/* Hide Read History */}
        {renderSection(
          null,
          <>
            {renderSettingItem({
              title: t('settings.hideReadHistory'),
              rightElement: (
                <Switch
                  value={hideReadHistory}
                  onValueChange={setHideReadHistory}
                  trackColor={{ false: theme.border, true: theme.success }}
                  thumbColor={'#FFFFFF'}
                />
              ),
              showChevron: false,
            })}
          </>
        )}
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          {t('settings.hideReadHistoryHint')}
        </Text>

        {/* Settings Section */}
        {renderSection(
          t('settings.settingsSection'),
          <>
            {renderSettingItem({
              title: t('settings.language'),
              value: SUPPORTED_LANGUAGES[currentLang].nativeName,
              onPress: handleLanguageChange,
            })}
            {renderSettingItem({
              title: t('settings.errorPopups'),
              rightElement: (
                <Switch
                  value={errorPopups}
                  onValueChange={setErrorPopups}
                  trackColor={{ false: theme.border, true: theme.success }}
                  thumbColor={'#FFFFFF'}
                />
              ),
              showChevron: false,
            })}
            {renderSettingItem({
              title: t('settings.generalSettings'),
              onPress: () => navigation.navigate('GeneralSettings'),
            })}
            {renderSettingItem({
              title: t('settings.themeSettings'),
              onPress: () => navigation.navigate('ThemeSettings'),
            })}
            {renderSettingItem({
              title: t('extensions.title'),
              onPress: () => navigation.navigate('Extensions'),
            })}
            {renderSettingItem({
              title: t('settings.backups'),
              onPress: () => navigation.navigate('Backups'),
            })}
            {renderSettingItem({
              title: t('settings.clearReadingHistory'),
              isDestructive: true,
              onPress: () => {
                Alert.alert(
                  t('settings.clearReadingHistory'),
                  t('settings.clearHistoryConfirm'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: async () => {
                        await clearHistory();
                        Alert.alert(t('common.success'), t('settings.historyCleared'));
                      },
                    },
                  ]
                );
              },
              showChevron: false,
            })}
            {renderSettingItem({
              title: t('settings.attemptDatabaseRepair'),
              isDestructive: true,
              onPress: () => Alert.alert(t('settings.databaseRepair'), t('settings.repairAttempted')),
              showChevron: false,
            })}
          </>
        )}

        {/* Storage */}
        {renderSection(
          t('settings.storageSection'),
          <>
            {renderSettingItem({
              title: t('settings.imageCacheSize'),
              value: cacheLimit,
              onPress: handleCacheLimitChange,
            })}
            {renderSettingItem({
              title: t('settings.clearImageCache'),
              isDestructive: true,
              value: isClearing ? undefined : cacheSize,
              rightElement: isClearing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : undefined,
              onPress: isClearing ? undefined : handleClearCache,
              showChevron: false,
            })}
          </>
        )}

        {/* Information */}
        {renderSection(
          t('settings.informationSection'),
          <>
            {renderSettingItem({
              title: t('settings.developer'),
              onPress: () => navigation.navigate('Developer'),
            })}
            {renderSettingItem({
              title: t('settings.exportAppLogs'),
              onPress: async () => {
                try {
                  const logData = {
                    timestamp: new Date().toISOString(),
                    app: {
                      name: Constants.expoConfig?.name || 'Paperand',
                      version: Constants.expoConfig?.version || '0.0.1',
                      sdkVersion: Constants.expoConfig?.sdkVersion || 'unknown',
                      platform: Platform.OS,
                      platformVersion: Platform.Version,
                    },
                    device: {
                      brand: Constants.deviceName || 'unknown',
                    },
                  };

                  const logContent = JSON.stringify(logData, null, 2);
                  const logFileName = `paperand-logs-${Date.now()}.json`;
                  const logFile = new File(Paths.cache, logFileName);

                  await logFile.create();
                  await logFile.write(logContent);

                  const canShare = await Sharing.isAvailableAsync();
                  if (canShare) {
                    await Sharing.shareAsync(logFile.uri, {
                      mimeType: 'application/json',
                      dialogTitle: t('settings.exportLogs'),
                    });
                  } else {
                    Alert.alert(t('common.error'), t('settings.sharingNotAvailable'));
                  }
                } catch (error) {
                  console.error('Failed to export logs:', error);
                  Alert.alert(t('common.error'), t('settings.exportLogsFailed'));
                }
              },
            })}
            {renderSettingItem({
              title: t('settings.discordServer'),
              subtitle: t('common.comingSoon'),
              onPress: () => Alert.alert('Discord', t('settings.discordComingSoon')),
            })}
            {renderSettingItem({
              title: t('settings.credits'),
              onPress: () => navigation.navigate('Credits'),
            })}
          </>
        )}

        <Text style={[styles.versionText, { color: theme.textSecondary }]}>
          v{Constants.expoConfig?.version || '0.0.1'}
        </Text>
      </ScrollView>

      {/* Cache Size Picker Modal for Android */}
      <PickerModal
        visible={showCachePicker}
        title={t('settings.imageCacheSize')}
        subtitle={t('settings.imageCacheSizeHint')}
        options={['No Cache', '300MB', '500MB', '1GB', '3GB', '5GB', '10GB'] as CacheLimitOption[]}
        selectedValue={cacheLimit}
        onSelect={handleCacheLimitSelect}
        onClose={() => setShowCachePicker(false)}
      />

      {/* Language Picker Modal for Android */}
      <PickerModal
        visible={showLanguagePicker}
        title={t('settings.language')}
        subtitle={t('settings.selectLanguage')}
        options={Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[]}
        selectedValue={currentLang}
        onSelect={handleLanguageSelect}
        onClose={() => setShowLanguagePicker(false)}
        renderOption={(option) => SUPPORTED_LANGUAGES[option as LanguageCode].nativeName}
      />
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
    fontSize: 34,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  settingContent: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 17,
    marginRight: 6,
  },
  chevron: {
    marginLeft: 4,
    opacity: 0.5,
  },
  footerText: {
    fontSize: 13,
    marginHorizontal: 32,
    marginTop: -16,
    marginBottom: 24,
    lineHeight: 18,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 20,
  }
});
