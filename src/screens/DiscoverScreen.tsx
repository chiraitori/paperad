import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { LoadingIndicator } from '../components';
import { 
  getInstalledExtensions, 
  getHomeSections, 
  InstalledExtension,
  HomeSection,
  SourceManga,
  getTags,
  Tag,
} from '../services/sourceService';
import { RootStackParamList } from '../types';

type DiscoverScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const GENRE_CARD_WIDTH = (width - 56) / 3;

// Predefined colors for genre cards (Paperback style)
const GENRE_COLORS = [
  '#E57373', // Red
  '#F06292', // Pink
  '#BA68C8', // Purple
  '#9575CD', // Deep Purple
  '#7986CB', // Indigo
  '#64B5F6', // Blue
  '#4FC3F7', // Light Blue
  '#4DD0E1', // Cyan
  '#4DB6AC', // Teal
  '#81C784', // Green
  '#AED581', // Light Green
  '#DCE775', // Lime
  '#FFD54F', // Amber
  '#FFB74D', // Orange
  '#FF8A65', // Deep Orange
];

export const DiscoverScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<DiscoverScreenNavigationProp>();
  const [installedExtensions, setInstalledExtensions] = useState<InstalledExtension[]>([]);
  const [activeSource, setActiveSource] = useState<string>('');
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [featuredItems, setFeaturedItems] = useState<SourceManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadExtensions();
    }, [])
  );

  useEffect(() => {
    if (activeSource) {
      loadSourceData(activeSource);
    }
  }, [activeSource]);

  const loadExtensions = async () => {
    try {
      const extensions = await getInstalledExtensions();
      setInstalledExtensions(extensions);
      
      if (extensions.length > 0) {
        if (!activeSource || !extensions.find((e: InstalledExtension) => e.id === activeSource)) {
          setActiveSource(extensions[0].id);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load extensions:', error);
      setLoading(false);
    }
  };

  const loadSourceData = async (extensionId: string) => {
    setLoading(true);
    try {
      const [homeSections, sourceTags] = await Promise.all([
        getHomeSections(extensionId),
        getTags(extensionId),
      ]);
      
      setSections(homeSections);
      setTags(sourceTags);
      
      // Find featured section or use first section's first item
      const featuredSection = homeSections.find(s => s.type === 'featured');
      if (featuredSection && featuredSection.items.length > 0) {
        setFeaturedItems(featuredSection.items);
      } else if (homeSections.length > 0 && homeSections[0].items.length > 0) {
        // Use first few items from first section as featured
        setFeaturedItems(homeSections[0].items.slice(0, 5));
      } else {
        setFeaturedItems([]);
      }
    } catch (error) {
      console.error('Failed to load source data:', error);
      setSections([]);
      setTags([]);
      setFeaturedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeSource) {
      await loadSourceData(activeSource);
    }
    setRefreshing(false);
  };

  const navigateToManga = (manga: SourceManga) => {
    navigation.navigate('MangaDetail', { 
      mangaId: manga.mangaId || manga.id,
      sourceId: manga.extensionId,
    });
  };

  const navigateToGenre = (tag: Tag) => {
    navigation.navigate('Category', {
      sourceId: activeSource,
      sectionId: `genre-${tag.id}`,
      title: tag.label,
      tagId: tag.id,
    });
  };

  const navigateToAllGenres = () => {
    navigation.navigate('GenreList', {
      sourceId: activeSource,
      tags: tags,
    });
  };

  const renderSourceTabs = () => {
    if (installedExtensions.length === 0) {
      return (
        <View style={[styles.noExtensionsContainer, { borderBottomColor: theme.border }]}>
          <Text style={[styles.noExtensionsText, { color: theme.textSecondary }]}>
            No extensions installed
          </Text>
          <TouchableOpacity 
            style={[styles.addExtensionButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Extensions' as any)}
          >
            <Text style={styles.addExtensionText}>Add Extensions</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.tabsWrapper, { borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {installedExtensions.map(ext => (
            <TouchableOpacity
              key={ext.id}
              style={[
                styles.tab,
                activeSource === ext.id && styles.activeTab,
                activeSource === ext.id && { borderBottomColor: theme.primary },
              ]}
              onPress={() => setActiveSource(ext.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeSource === ext.id ? theme.primary : theme.textSecondary },
                ]}
              >
                {ext.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFeaturedBanner = () => {
    if (featuredItems.length === 0) return null;

    const renderFeaturedItem = (manga: SourceManga, index: number) => (
      <TouchableOpacity 
        key={`featured-${manga.id}-${index}`}
        style={styles.featuredContainer}
        onPress={() => navigateToManga(manga)}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: manga.image }}
          style={styles.featuredImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {manga.title}
              </Text>
              {manga.subtitle && (
                <Text style={styles.featuredSubtitle} numberOfLines={1}>
                  {manga.subtitle}
                </Text>
              )}
              <View style={styles.featuredButtons}>
                <TouchableOpacity 
                  style={[styles.featuredButton, styles.addToLibraryButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    // TODO: Add to library functionality
                  }}
                >
                  <Ionicons name="bookmark-outline" size={16} color="#fff" />
                  <Text style={styles.addButtonText}>Add to Library</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.featuredButton, styles.readNowButton]}
                  onPress={() => navigateToManga(manga)}
                >
                  <Ionicons name="book-outline" size={16} color={theme.primary} />
                  <Text style={[styles.readButtonText, { color: theme.primary }]}>Read Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );

    // If only one featured item, render it directly
    if (featuredItems.length === 1) {
      return (
        <View style={styles.featuredWrapper}>
          {renderFeaturedItem(featuredItems[0], 0)}
        </View>
      );
    }

    // Multiple featured items - render as horizontal carousel
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        style={styles.featuredCarousel}
        contentContainerStyle={styles.featuredCarouselContent}
      >
        {featuredItems.map((manga, index) => renderFeaturedItem(manga, index))}
      </ScrollView>
    );
  };

  const renderGenreCard = (tag: Tag, index: number) => {
    const color = GENRE_COLORS[index % GENRE_COLORS.length];
    
    return (
      <TouchableOpacity
        key={tag.id}
        style={[styles.genreCard, { backgroundColor: color }]}
        onPress={() => navigateToGenre(tag)}
        activeOpacity={0.8}
      >
        <Text style={styles.genreText} numberOfLines={1}>{tag.label}</Text>
        <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    );
  };

  const renderGenresSection = () => {
    if (tags.length === 0) return null;

    const displayTags = tags.slice(0, 6); // Show first 6 genres

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Genres</Text>
          {tags.length > 6 && (
            <TouchableOpacity 
              style={[styles.expandButton, { backgroundColor: theme.card }]}
              onPress={navigateToAllGenres}
            >
              <Ionicons name="resize-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.genresGrid}>
          {displayTags.map((tag, index) => renderGenreCard(tag, index))}
        </View>
      </View>
    );
  };

  const renderMangaCard = (manga: SourceManga, sectionId: string, index: number) => (
    <TouchableOpacity
      key={`${sectionId}-${manga.id}-${index}`}
      style={styles.mangaCard}
      onPress={() => navigateToManga(manga)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: manga.image }}
        style={[styles.mangaCover, { backgroundColor: theme.card }]}
      />
      <Text
        style={[styles.mangaTitle, { color: theme.text }]}
        numberOfLines={2}
      >
        {manga.title}
      </Text>
      {manga.subtitle && (
        <Text style={[styles.mangaSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {manga.subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  const navigateToCategory = (section: HomeSection) => {
    navigation.navigate('Category', {
      sourceId: activeSource,
      sectionId: section.id,
      title: section.title,
      initialItems: section.items,
    });
  };

  const renderSection = (section: HomeSection) => {
    if (!section.items || section.items.length === 0) {
      return null;
    }

    // Skip featured sections - they're rendered as the banner
    if (section.type === 'featured') {
      return null;
    }

    return (
      <View key={section.id} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
          {section.containsMoreItems && (
            <TouchableOpacity 
              style={[styles.expandButton, { backgroundColor: theme.card }]}
              onPress={() => navigateToCategory(section)}
            >
              <Ionicons name="resize-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mangaList}
        >
          {section.items.map((manga: SourceManga, index: number) => renderMangaCard(manga, section.id, index))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Discover</Text>
        <TouchableOpacity 
          style={styles.globeButton}
          onPress={() => navigation.navigate('Extensions' as any)}
        >
          <Ionicons name="globe-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Source Tabs */}
      {renderSourceTabs()}

      {/* Content */}
      {loading ? (
        <LoadingIndicator message="Loading..." />
      ) : sections.length === 0 && tags.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {installedExtensions.length === 0 
              ? 'Install extensions to discover manga'
              : 'No content available'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* Featured Banner */}
          {renderFeaturedBanner()}

          {/* Genres Section */}
          {renderGenresSection()}

          {/* Content Sections */}
          {sections.map((section) => renderSection(section))}
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  globeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabsContainer: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    paddingBottom: 100,
  },
  // Featured Banner Styles
  featuredWrapper: {
    paddingTop: 16,
  },
  featuredCarousel: {
    marginTop: 16,
  },
  featuredCarouselContent: {
    paddingHorizontal: 0,
  },
  featuredContainer: {
    width: width - 32,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 260,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredContent: {
    gap: 6,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  featuredSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  featuredButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addToLibraryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  readNowButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  readButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Genres Section Styles
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  genreCard: {
    width: GENRE_CARD_WIDTH,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  // Section Styles
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  expandButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  mangaList: {
    paddingHorizontal: 16,
  },
  mangaCard: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  mangaCover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 8,
    marginBottom: 8,
  },
  mangaTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 2,
  },
  mangaSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  noExtensionsContainer: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  noExtensionsText: {
    fontSize: 14,
    marginBottom: 12,
  },
  addExtensionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addExtensionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});
