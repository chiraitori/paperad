import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import {
  DeveloperSettings,
  getDeveloperSettings,
  saveDeveloperSettings,
  initLogCapture,
  getLogs,
  clearLogs,
  getMemoryInfo,
  getPerformanceInfo,
} from '../services/developerService';

export const DeveloperScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { clearHistory, clearLibrary } = useLibrary();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<DeveloperSettings>({
    debugMode: false,
    verboseLogging: false,
    networkInspector: false,
    showMemoryUsage: false,
    showFpsCounter: false,
    customApiEndpoint: '',
    enableTestAds: false,
  });
  const [memoryInfo, setMemoryInfo] = useState({ used: 'N/A', available: 'N/A' });
  const [performanceInfo, setPerformanceInfo] = useState<any>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getDeveloperSettings();
        setSettings(savedSettings);
        initLogCapture();

        // Get memory and performance info
        setMemoryInfo(getMemoryInfo());
        const perfInfo = await getPerformanceInfo();
        setPerformanceInfo(perfInfo);
      } catch (error) {
        console.error('Failed to load developer settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Update setting and persist
  const updateSetting = useCallback(async (key: keyof DeveloperSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveDeveloperSettings({ [key]: value });
  }, [settings]);

  // Export logs function
  const exportLogs = async () => {
    try {
      const logs = getLogs();
      if (logs.length === 0) {
        Alert.alert('No Logs', 'There are no logs to export.');
        return;
      }

      const logContent = logs.map(log =>
        `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
      ).join('\n');

      const docDir = (FileSystem as any).documentDirectory as string | null;
      if (!docDir) {
        Alert.alert('Export Failed', 'Could not access document directory');
        return;
      }

      const fileUri = docDir + `developer_logs_${Date.now()}.txt`;
      await (FileSystem as any).writeAsStringAsync(fileUri, logContent, {
        encoding: 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Export Developer Logs',
        });
      } else {
        Alert.alert('Export Complete', `Logs saved to: ${fileUri}`);
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export logs');
    }
  };

  // Test notification
  const testPushNotification = async () => {
    try {
      // Request permissions first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          '❌ Permission Denied',
          'Push notification permission was denied. Please enable notifications in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configure notification handler for foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Schedule an immediate notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Paperand Test Notification',
          body: 'This is a test push notification from the Developer screen!',
          data: { type: 'test', timestamp: Date.now() },
          sound: true,
        },
        trigger: null, // null means immediate
      });

      // Log the test
      console.log('[TEST] Push notification sent successfully');

      Alert.alert(
        '✅ Notification Sent',
        'Check your notification tray!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[TEST] Push notification failed:', error);
      Alert.alert(
        '❌ Error',
        `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Simulate crash
  const simulateCrash = () => {
    Alert.alert(
      '⚠️ Simulate Crash',
      'This will throw a JavaScript error. The app may need to be reloaded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash',
          style: 'destructive',
          onPress: () => {
            console.error('[CRASH] Simulated crash triggered by developer');
            // Throw an error to simulate crash
            throw new Error('Simulated crash from Developer Screen');
          },
        },
      ]
    );
  };

  // Clear all data
  const clearAllData = () => {
    Alert.alert(
      '🗑️ Clear All Data',
      'This will permanently delete:\n• Library entries\n• Reading history & progress\n• All settings\n• Cached data\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear AsyncStorage
              await AsyncStorage.clear();

              // Clear logs
              clearLogs();

              // Clear context states
              clearHistory();
              clearLibrary();

              Alert.alert(
                '✅ Data Cleared',
                'All app data has been cleared. Please restart the app for changes to take effect.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear some data. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Force refresh performance info
  const refreshPerformanceInfo = async () => {
    setMemoryInfo(getMemoryInfo());
    const perfInfo = await getPerformanceInfo();
    setPerformanceInfo(perfInfo);
    Alert.alert('Refreshed', 'Performance info updated');
  };

  const renderSettingItem = ({
    title,
    subtitle,
    rightElement,
    onPress,
    isDestructive = false,
  }: {
    title: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: isDestructive ? theme.error : theme.text }]}>
          {title}
        </Text>
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
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Developer</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading developer settings...
            </Text>
          </View>
        ) : (
          <>
            {/* Debug Options */}
            {renderSection(
              'DEBUG OPTIONS',
              <>
                {renderSettingItem({
                  title: 'Debug Mode',
                  subtitle: 'Enable debug features and console output',
                  rightElement: (
                    <Switch
                      value={settings.debugMode}
                      onValueChange={(value) => updateSetting('debugMode', value)}
                      trackColor={{ false: theme.border, true: theme.success }}
                      thumbColor="#FFFFFF"
                    />
                  ),
                })}
                {renderSettingItem({
                  title: 'Verbose Logging',
                  subtitle: 'Log detailed information for debugging',
                  rightElement: (
                    <Switch
                      value={settings.verboseLogging}
                      onValueChange={(value) => updateSetting('verboseLogging', value)}
                      trackColor={{ false: theme.border, true: theme.success }}
                      thumbColor="#FFFFFF"
                    />
                  ),
                })}
                {renderSettingItem({
                  title: 'Network Inspector',
                  subtitle: 'Monitor all network requests',
                  rightElement: (
                    <Switch
                      value={settings.networkInspector}
                      onValueChange={(value) => updateSetting('networkInspector', value)}
                      trackColor={{ false: theme.border, true: theme.success }}
                      thumbColor="#FFFFFF"
                    />
                  ),
                })}
                {renderSettingItem({
                  title: 'Show Memory Usage',
                  subtitle: 'Display memory stats in performance section',
                  rightElement: (
                    <Switch
                      value={settings.showMemoryUsage}
                      onValueChange={(value) => updateSetting('showMemoryUsage', value)}
                      trackColor={{ false: theme.border, true: theme.success }}
                      thumbColor="#FFFFFF"
                    />
                  ),
                })}
              </>
            )}

            {/* API Configuration */}
            {renderSection(
              'API CONFIGURATION',
              <>
                {renderSettingItem({
                  title: 'Custom API Endpoint',
                  subtitle: settings.customApiEndpoint || 'Not configured (using default)',
                  onPress: () => {
                    if (Alert.prompt) {
                      Alert.prompt(
                        'Custom API URL',
                        'Enter custom API endpoint (leave empty to reset)',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Save',
                            onPress: (text?: string) => updateSetting('customApiEndpoint', text || ''),
                          },
                        ],
                        'plain-text',
                        settings.customApiEndpoint
                      );
                    } else {
                      Alert.alert('API URL', `Current: ${settings.customApiEndpoint || 'Default'}\n\nEdit in code for Android.`);
                    }
                  },
                })}
                {renderSettingItem({
                  title: 'Reset API Configuration',
                  isDestructive: true,
                  onPress: () => {
                    updateSetting('customApiEndpoint', '');
                    Alert.alert('✅ Reset', 'API configuration has been reset to default');
                  },
                })}
              </>
            )}

            {/* Logging */}
            {renderSection(
              'LOGGING',
              <>
                {renderSettingItem({
                  title: 'Export Developer Logs',
                  subtitle: `${getLogs().length} log entries captured`,
                  onPress: exportLogs,
                })}
                {renderSettingItem({
                  title: 'Clear Logs',
                  isDestructive: true,
                  onPress: () => {
                    clearLogs();
                    Alert.alert('✅ Cleared', 'All developer logs have been cleared');
                  },
                })}
              </>
            )}

            {/* Testing */}
            {renderSection(
              'TESTING',
              <>
                {renderSettingItem({
                  title: 'Test Push Notifications',
                  subtitle: 'Send a test notification to this device',
                  onPress: testPushNotification,
                })}
                {renderSettingItem({
                  title: 'Simulate Crash',
                  subtitle: 'Throw a JavaScript error for testing',
                  isDestructive: true,
                  onPress: simulateCrash,
                })}
                {renderSettingItem({
                  title: 'Clear All Data',
                  subtitle: 'Remove all app data and reset to defaults',
                  isDestructive: true,
                  onPress: clearAllData,
                })}
              </>
            )}

            {/* Performance */}
            {settings.showMemoryUsage && renderSection(
              'PERFORMANCE',
              <>
                {renderSettingItem({
                  title: 'Memory Used',
                  rightElement: (
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                      {memoryInfo.used}
                    </Text>
                  ),
                })}
                {renderSettingItem({
                  title: 'Memory Available',
                  rightElement: (
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                      {memoryInfo.available}
                    </Text>
                  ),
                })}
                {performanceInfo && (
                  <>
                    {renderSettingItem({
                      title: 'Device',
                      rightElement: (
                        <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                          {performanceInfo.deviceName}
                        </Text>
                      ),
                    })}
                    {renderSettingItem({
                      title: 'OS Version',
                      rightElement: (
                        <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                          {performanceInfo.osVersion}
                        </Text>
                      ),
                    })}
                  </>
                )}
                {renderSettingItem({
                  title: 'Refresh Performance Info',
                  onPress: refreshPerformanceInfo,
                })}
              </>
            )}

            {/* App Info */}
            {renderSection(
              'APP INFO',
              <>
                {renderSettingItem({
                  title: 'Version',
                  rightElement: (
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                      {Constants.expoConfig?.version || '0.0.1'}
                    </Text>
                  ),
                })}
                {renderSettingItem({
                  title: 'Build Number',
                  rightElement: (
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                      {Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.ios?.buildNumber || '1'}
                    </Text>
                  ),
                })}
                {renderSettingItem({
                  title: 'React Native',
                  rightElement: (
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                      {Platform.constants?.reactNativeVersion ?
                        `${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}.${Platform.constants.reactNativeVersion.patch}` :
                        '0.81.x'}
                    </Text>
                  ),
                })}
                {renderSettingItem({
                  title: 'Expo SDK',
                  rightElement: (
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                      {Constants.expoConfig?.sdkVersion || '54'}
                    </Text>
                  ),
                })}
                {renderSettingItem({
                  title: 'Platform',
                  rightElement: (
                    <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                      {Platform.OS} ({Platform.Version})
                    </Text>
                  ),
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backText: {
    fontSize: 17,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  valueText: {
    fontSize: 17,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
});
