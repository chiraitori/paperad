import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/context/ThemeContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { AppNavigator } from './src/navigation';
import { ExtensionRunner, UpdateModal } from './src/components';
import {
  parseDeepLink,
  addRepositoryFromDeepLink,
  getInitialDeepLink,
  subscribeToDeepLinks,
} from './src/services/deepLinkService';
import {
  checkForUpdate,
  ReleaseInfo,
} from './src/services/updateService';
import { initLogCapture } from './src/services/developerService';

// Initialize log capture immediately so all logs are captured from startup
initLogCapture();

const SETTINGS_KEY = '@general_settings';

const handleDeepLink = async (url: string) => {
  const action = parseDeepLink(url);
  if (!action) return;

  if (action.type === 'addRepo') {
    const { displayName, url: repoUrl } = action.params;
    if (displayName && repoUrl) {
      const result = await addRepositoryFromDeepLink(displayName, repoUrl);
      Alert.alert(
        result.success ? 'Success' : 'Notice',
        result.message,
        [{ text: 'OK' }]
      );
    }
  }
};

export default function App() {
  // Update modal state
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);

  // Check for updates on app start
  useEffect(() => {
    const performUpdateCheck = async () => {
      try {
        // Check if user has disabled update modal
        const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.hideUpdateModal) {
            console.log('Update modal is disabled by user settings');
            return;
          }
        }

        console.log('Checking for updates...');
        const result = await checkForUpdate(true); // force=true to bypass cache
        console.log('Update check result:', JSON.stringify(result, null, 2));
        if (result.hasUpdate && result.latestRelease) {
          setCurrentVersion(result.currentVersion);
          setLatestRelease(result.latestRelease);
          setUpdateModalVisible(true);
        } else if (result.error) {
          console.error('Update check error:', result.error);
        }
      } catch (error) {
        console.error('Update check failed:', error);
      }
    };

    // Delay update check slightly to let app initialize
    const timer = setTimeout(performUpdateCheck, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Handle initial deep link (app launched from URL)
    getInitialDeepLink().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Subscribe to deep links while app is running
    const unsubscribe = subscribeToDeepLinks((url) => {
      handleDeepLink(url);
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LibraryProvider>
          <StatusBar style="auto" />
          <AppNavigator />
          <ExtensionRunner />
          {latestRelease && (
            <UpdateModal
              visible={updateModalVisible}
              currentVersion={currentVersion}
              releaseInfo={latestRelease}
              onClose={() => setUpdateModalVisible(false)}
              onSkip={() => setUpdateModalVisible(false)}
            />
          )}
        </LibraryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
