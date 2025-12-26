import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { MangaCard, EmptyState, MangaPreviewModal } from '../components';
import { RootStackParamList, LibraryEntry, Manga } from '../types';
import { getGeneralSettings, GeneralSettings, defaultSettings } from '../services/settingsService';

type LibraryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'favorites' | 'reading' | 'completed';

export const LibraryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { library, favorites, addToLibrary, removeFromLibrary, toggleFavorite, isInLibrary, isFavorite } = useLibrary();
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const { width, height } = useWindowDimensions();

  // Preview modal state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewManga, setPreviewManga] = useState<Manga | null>(null);
  const [previewSourceId, setPreviewSourceId] = useState<string | undefined>();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Track app state for re-auth on resume
  const appState = useRef(AppState.currentState);

  // Auth check function - extracted so it can be called from AppState listener
  const performAuthCheck = useCallback(async () => {
    const loadedSettings = await getGeneralSettings();
    setSettings(loadedSettings);

    if (loadedSettings.libraryAuth) {
      // Require authentication - will use biometric or device PIN/passcode
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view Library',
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

  // Prevent screen capture when library auth is enabled
  usePreventScreenCapture(settings.libraryAuth ? 'library_auth' : undefined);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reload settings on refresh
    const loadedSettings = await getGeneralSettings();
    setSettings(loadedSettings);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const getFilteredLibrary = (): LibraryEntry[] => {
    switch (activeFilter) {
      case 'favorites':
        return favorites;
      case 'reading':
        return library.filter(entry => entry.progress !== null);
      case 'completed':
        return library.filter(entry => entry.manga.status === 'completed');
      default:
        return library;
    }
  };

  const filteredLibrary = getFilteredLibrary();

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'reading', label: 'Reading' },
    { key: 'completed', label: 'Completed' },
  ];

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
    <MangaCard
      manga={item.manga}
      onPress={() => navigateToManga(item)}
      onLongPress={() => handleLongPress(item)}
      compact
      columns={numColumns}
    />
  );

  const handleRetryAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to view Library',
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
          <Text style={[styles.title, { color: theme.text }]}>Library</Text>
        </View>
      </View>
    );
  }

  // Show locked state if auth required but not authenticated
  if (settings.libraryAuth && !isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Library</Text>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.textSecondary} />
          <Text style={[styles.lockedTitle, { color: theme.text }]}>
            Library is Locked
          </Text>
          <Text style={[styles.lockedDescription, { color: theme.textSecondary }]}>
            Authenticate to view your manga library
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
        <Text style={[styles.title, { color: theme.text }]}>Library</Text>
      </View>

      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && {
                backgroundColor: theme.primary,
              },
              activeFilter !== filter.key && {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: activeFilter === filter.key ? '#FFFFFF' : theme.text,
                },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredLibrary.length === 0 ? (
        <EmptyState
          icon="🔖"
          title="Your library is empty"
          description="Add manga from the Discover tab to start building your collection"
        />
      ) : (
        <FlatList
          key={`library-${numColumns}`} // Force re-render when columns change
          data={filteredLibrary}
          renderItem={renderItem}
          keyExtractor={item => item.manga.id}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 4,
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
