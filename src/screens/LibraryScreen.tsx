import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

  // Determine orientation and get appropriate column count
  const isLandscape = width > height;
  const numColumns = isLandscape ? settings.landscapeColumns : settings.portraitColumns;

  // Load settings when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        const loadedSettings = await getGeneralSettings();
        setSettings(loadedSettings);
      };
      loadSettings();
    }, [])
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
});
