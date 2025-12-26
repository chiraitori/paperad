import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Alert, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/context/ThemeContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { AppNavigator, navigationRef } from './src/navigation';
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
import { Action, setItems } from 'expo-quick-actions';
import { useQuickAction } from 'expo-quick-actions/hooks';
import { initLogCapture } from './src/services/developerService';

// Initialize log capture immediately so all logs are captured from startup
initLogCapture();

const SETTINGS_KEY = '@general_settings';

const handleDeepLink = async (url: string) => {
  // ... (rest of helper functions)
  // skipping unchanged lines for brevity in prompt, but tool requires clean replacement
  // actually I'll just target the import and usage separately or use a larger block carefully
  // Let's replace the import line first

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

  // Privacy overlay state - show when app is in background/inactive
  const [isAppInactive, setIsAppInactive] = useState(false);
  const appState = useRef(AppState.currentState);

  // Hook for handling quick action routing
  // Note: Since we're using React Navigation, the router implementation handles the navigation
  // based on the action params. However, since we might need custom handling for tabs,
  // we listen to the action here.
  const quickAction = useQuickAction();

  // Listen for app state changes to show privacy overlay
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Show overlay when app goes to background or inactive (multitasking view)
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsAppInactive(true);
      } else if (nextAppState === 'active') {
        setIsAppInactive(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Check for updates on app start
  useEffect(() => {
    // Set up quick actions safely
    try {
      setItems([
        {
          title: 'Library',
          subtitle: 'View your manga library',
          icon: 'bookmark',
          id: 'library',
          params: { href: '/library' },
        },
        {
          title: 'History',
          subtitle: 'Check reading history',
          icon: 'time',
          id: 'history',
          params: { href: '/history' },
        },
        {
          title: 'Search',
          subtitle: 'Search for manga',
          icon: 'search',
          id: 'search',
          params: { href: '/search' },
        },
      ]);
    } catch (e) {
      console.warn('Failed to set quick actions:', e);
    }

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

  // Handle Quick Action navigation
  useEffect(() => {
    if (quickAction) {
      if (navigationRef.isReady()) {
        const routeName = quickAction.id;
        // Map quick action IDs to tab names
        switch (routeName) {
          case 'library':
            navigationRef.navigate('Main', { screen: 'Library' });
            break;
          case 'history':
            navigationRef.navigate('Main', { screen: 'History' });
            break;
          case 'search':
            navigationRef.navigate('Main', { screen: 'Search' });
            break;
          default:
            console.log('Unknown quick action:', routeName);
        }
      }
    }
  }, [quickAction]);

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
          {/* Privacy overlay for multitasking - covers content when app is in background */}
          {isAppInactive && (
            <View style={styles.privacyOverlay}>
              <Text style={styles.privacyIcon}>📚</Text>
              <Text style={styles.privacyTitle}>Paperand</Text>
            </View>
          )}
        </LibraryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  privacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  privacyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  privacyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
