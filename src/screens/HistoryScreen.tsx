import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { MangaCard, EmptyState, MangaPreviewModal } from '../components';
import { RootStackParamList, LibraryEntry, Manga } from '../types';
import { getGeneralSettings, GeneralSettings, defaultSettings } from '../services/settingsService';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { library, clearHistory, addToLibrary, removeFromLibrary, toggleFavorite, isInLibrary, isFavorite } = useLibrary();
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const { width, height } = useWindowDimensions();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Preview modal state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewManga, setPreviewManga] = useState<Manga | null>(null);
  const [previewSourceId, setPreviewSourceId] = useState<string | undefined>();

  // Track app state for re-auth on resume
  const appState = useRef(AppState.currentState);

  // Auth check function - extracted so it can be called from AppState listener
  const performAuthCheck = useCallback(async () => {
    const loadedSettings = await getGeneralSettings();
    setSettings(loadedSettings);

    if (loadedSettings.historyAuth) {
      // Require authentication - will use biometric or device PIN/passcode
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view History',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      setIsAuthenticated(result.success);
    } else {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  // Determine orientation and get appropriate column count
  const isLandscape = width > height;
  const numColumns = isLandscape ? settings.landscapeColumns : settings.portraitColumns;

  // Listen for app state changes to re-lock when coming from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // When app comes back from background to active
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Reset and re-authenticate
        setIsAuthenticated(false);
        setAuthChecked(false);
        // Trigger re-auth
        await performAuthCheck();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [performAuthCheck]);

  // Prevent screen capture when history auth is enabled
  usePreventScreenCapture(settings.historyAuth ? 'history_auth' : undefined);

  // Load settings and check auth when screen is focused
  useFocusEffect(
    useCallback(() => {
      performAuthCheck();

      // Reset auth when leaving screen
      return () => {
        setIsAuthenticated(false);
        setAuthChecked(false);
      };
    }, [performAuthCheck])
  );

  // Filter and sort by last read
  const readingHistory = library
    .filter(entry => entry.progress !== null)
    .sort((a, b) => {
      const dateA = new Date(a.progress?.lastRead || 0);
      const dateB = new Date(b.progress?.lastRead || 0);
      return dateB.getTime() - dateA.getTime();
    });

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Reading History',
      'Are you sure you want to clear all reading history? This will remove all entries except favorites. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
          },
        },
      ]
    );
  };

  const navigateToManga = (entry: LibraryEntry) => {
    navigation.navigate('MangaDetail', {
      mangaId: entry.manga.id,
      sourceId: entry.manga.source
    });
  };

  const handleLongPress = (entry: LibraryEntry) => {
    if (settings.mangaPreviewEnabled) {
      setPreviewManga(entry.manga);
      setPreviewSourceId(entry.manga.source);
      setPreviewVisible(true);
    }
  };

  const handlePreviewReadNow = (manga: Manga, chapterId: string) => {
    navigation.navigate('Reader', {
      mangaId: manga.id,
      chapterId,
      sourceId: manga.source,
    });
  };

  const handlePreviewViewDetails = (manga: Manga) => {
    navigation.navigate('MangaDetail', {
      mangaId: manga.id,
      sourceId: manga.source,
    });
  };

  const renderItem = ({ item }: { item: LibraryEntry }) => (
    <View style={styles.itemContainer}>
      <MangaCard
        manga={item.manga}
        onPress={() => navigateToManga(item)}
        onLongPress={() => handleLongPress(item)}
        compact
        columns={numColumns}
      />
      {item.progress && (
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          Ch. {getChapterNumber(item)} • {formatDate(item.progress.lastRead)}
        </Text>
      )}
    </View>
  );

  const getChapterNumber = (entry: LibraryEntry): string => {
    if (!entry.progress) return '?';
    const chapter = entry.manga.chapters.find(ch => ch.id === entry.progress?.chapterId);
    return chapter?.number.toString() || '?';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };
  const handleRetryAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to view History',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    setIsAuthenticated(result.success);
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>History</Text>
        </View>
      </View>
    );
  }

  // Show locked state if auth required but not authenticated
  if (settings.historyAuth && !isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>History</Text>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.textSecondary} />
          <Text style={[styles.lockedTitle, { color: theme.text }]}>
            History is Locked
          </Text>
          <Text style={[styles.lockedDescription, { color: theme.textSecondary }]}>
            Authenticate to view your reading history
          </Text>
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: theme.primary }]}
            onPress={handleRetryAuth}
          >
            <Ionicons name="finger-print" size={20} color="#fff" />
            <Text style={styles.unlockButtonText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>History</Text>
        {readingHistory.length > 0 && isAuthenticated && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
          >
            <Ionicons name="trash-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        )}
      </View>

      {readingHistory.length === 0 ? (
        <EmptyState
          icon="📖"
          title="No reading history"
          description="Start reading some manga and your history will appear here"
        />
      ) : (
        <FlatList
          key={`history-${numColumns}`}
          data={readingHistory}
          renderItem={renderItem}
          keyExtractor={item => item.manga.id}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Preview Modal */}
      <MangaPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        manga={previewManga}
        sourceId={previewSourceId}
        onReadNow={handlePreviewReadNow}
        onAddToLibrary={addToLibrary}
        onRemoveFromLibrary={removeFromLibrary}
        onViewDetails={handlePreviewViewDetails}
        onToggleFavorite={toggleFavorite}
        isInLibrary={previewManga ? isInLibrary(previewManga.id) : false}
        isFavorite={previewManga ? isFavorite(previewManga.id) : false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 6,
  },
  itemContainer: {
    // Don't use flex: 1 - MangaCard calculates its own width
  },
  progressText: {
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  lockedDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
