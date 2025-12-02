import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LoadingIndicator } from '../components';
import { getViewMoreItems, searchByTag, SourceManga } from '../services/sourceService';
import { RootStackParamList } from '../types';

type CategoryScreenRouteProp = RouteProp<RootStackParamList, 'Category'>;
type CategoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

export const CategoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<CategoryScreenNavigationProp>();
  const route = useRoute<CategoryScreenRouteProp>();
  const { sourceId, sectionId, title, initialItems, tagId } = route.params;

  const [results, setResults] = useState<SourceManga[]>(initialItems || []);
  const [loading, setLoading] = useState(initialItems?.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      // Load first page if no initial items
      if (!initialItems || initialItems.length === 0) {
        loadItems(true);
      } else {
        // Load next page metadata
        loadItems(true);
      }
    }
  }, []);

  const loadItems = async (isFirstLoad: boolean = false) => {
    if (isFirstLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let result;
      
      // If we have a tagId, use searchByTag instead of getViewMoreItems
      if (tagId) {
        result = await searchByTag(
          sourceId,
          tagId,
          isFirstLoad ? null : metadata
        );
      } else {
        result = await getViewMoreItems(
          sourceId,
          sectionId,
          isFirstLoad ? null : metadata
        );
      }

      // Check if we got any results
      if (result.results.length === 0) {
        setHasMoreResults(false);
      } else {
        if (isFirstLoad) {
          // If we have initial items, append to them
          if (initialItems && initialItems.length > 0) {
            setResults([...initialItems, ...result.results]);
          } else {
            setResults(result.results);
          }
        } else {
          setResults(prev => [...prev, ...result.results]);
        }
      }
      
      // If no metadata returned, no more pages
      if (!result.metadata) {
        setHasMoreResults(false);
      } else {
        setMetadata(result.metadata);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      setHasMoreResults(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreItems = useCallback(() => {
    if (loadingMore || loading || !hasMoreResults) return;
    loadItems(false);
  }, [loadingMore, loading, hasMoreResults]);

  const navigateToManga = (manga: SourceManga) => {
    navigation.navigate('MangaDetail', {
      mangaId: manga.mangaId || manga.id,
      sourceId: manga.extensionId,
    });
  };

  const renderItem = ({ item, index }: { item: SourceManga; index: number }) => (
    <TouchableOpacity
      style={[styles.gridItem, { marginLeft: index % NUM_COLUMNS === 0 ? 0 : GRID_GAP }]}
      onPress={() => navigateToManga(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image }}
        style={[styles.gridCover, { backgroundColor: theme.card }]}
        contentFit="cover"
      />
      <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      {item.subtitle && (
        <Text style={[styles.gridSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {loading && results.length === 0 ? (
        <LoadingIndicator message="Loading..." />
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="albums-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No items found
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreItems}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingMoreText, { color: theme.textSecondary }]}>
                  Loading more...
                </Text>
              </View>
            ) : !hasMoreResults && results.length > 0 ? (
              <View style={styles.endOfResults}>
                <Text style={[styles.endOfResultsText, { color: theme.textSecondary }]}>
                  No more results
                </Text>
              </View>
            ) : null
          }
        />
      )}
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
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  gridContainer: {
    padding: GRID_PADDING,
    paddingBottom: 100,
  },
  gridItem: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  gridCover: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  gridSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingMoreText: {
    fontSize: 14,
  },
  endOfResults: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endOfResultsText: {
    fontSize: 14,
  },
});
