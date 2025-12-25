import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { ChapterListItem, LoadingIndicator } from '../components';
import { getMangaById } from '../data/mockData';
import { getMangaDetails, getChapters } from '../services/sourceService';
import { getGeneralSettings, updateGeneralSetting } from '../services/settingsService';
import { Manga, RootStackParamList } from '../types';

type MangaDetailRouteProp = RouteProp<RootStackParamList, 'MangaDetail'>;
type MangaDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

// Component to render text with clickable links parsed from HTML
const LinkifiedText: React.FC<{
  text: string;
  style?: any;
  linkStyle?: any;
  numberOfLines?: number;
}> = ({ text, style, linkStyle, numberOfLines }) => {
  // Parse HTML anchor tags and extract text/links
  const parseLinks = (input: string): Array<{ type: 'text' | 'link'; content: string; url?: string }> => {
    const parts: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];

    // Clean up the text first - remove <br /> tags and replace with newlines
    let cleanedInput = input.replace(/<br\s*\/?>/gi, '\n');

    // Regex to match anchor tags: <a href="url">text</a>
    const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;

    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(cleanedInput)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        const textBefore = cleanedInput.substring(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Extract URL - handle encoded URLs
      let url = match[1];
      // Check if it's a redirect URL like /jump.php?url=...
      if (url.includes('jump.php?')) {
        const urlMatch = url.match(/[?&](?:url=|)([^&]+)/i);
        if (urlMatch) {
          url = decodeURIComponent(urlMatch[1]);
        }
      }

      // Add the link
      parts.push({ type: 'link', content: match[2], url });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < cleanedInput.length) {
      const remaining = cleanedInput.substring(lastIndex);
      if (remaining.trim()) {
        parts.push({ type: 'text', content: remaining });
      }
    }

    // If no links found, return original text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: cleanedInput });
    }

    return parts;
  };

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  const parts = parseLinks(text);

  // Check if there are any links
  const hasLinks = parts.some(p => p.type === 'link');

  if (!hasLinks) {
    // No links, just render plain text
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text.replace(/<br\s*\/?>/gi, '\n')}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (part.type === 'link' && part.url) {
          return (
            <Text
              key={index}
              style={[{ color: '#FA6432', textDecorationLine: 'underline' }, linkStyle]}
              onPress={() => handleLinkPress(part.url!)}
            >
              {part.content}
            </Text>
          );
        }
        return <Text key={index}>{part.content}</Text>;
      })}
    </Text>
  );
};

export const MangaDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<MangaDetailRouteProp>();
  const navigation = useNavigation<MangaDetailNavigationProp>();
  const { isInLibrary, isFavorite, addToLibrary, removeFromLibrary, toggleFavorite, getProgress } = useLibrary();

  const [manga, setManga] = useState<Manga | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [sortDescending, setSortDescending] = useState(true);

  const { mangaId, sourceId } = route.params;
  const inLibrary = manga ? isInLibrary(manga.id) : false;
  const favorite = manga ? isFavorite(manga.id) : false;
  const progress = manga ? getProgress(manga.id) : null;

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getGeneralSettings();
      setSortDescending(settings.chapterListSort === 'descending');
    };
    loadSettings();
  }, []);

  useEffect(() => {
    loadManga();
  }, [mangaId, sourceId]);

  // Save sort preference when changed
  const handleSortToggle = async () => {
    const newSort = !sortDescending;
    setSortDescending(newSort);
    await updateGeneralSetting('chapterListSort', newSort ? 'descending' : 'ascending');
  };

  const loadManga = async () => {
    try {
      setLoading(true);

      // If sourceId is provided, use extension service
      if (sourceId) {
        console.log('[MangaDetail] Fetching from extension:', sourceId, mangaId);
        const details = await getMangaDetails(sourceId, mangaId);
        const chapters = await getChapters(sourceId, mangaId);

        console.log('[MangaDetail] Details:', JSON.stringify(details));
        console.log('[MangaDetail] Chapters:', JSON.stringify(chapters));

        if (details) {
          // Parse tags - they can be nested in sections
          let genres: string[] = [];
          if (details.tags) {
            details.tags.forEach((tagSection: any) => {
              if (tagSection.tags && Array.isArray(tagSection.tags)) {
                // Nested tag structure
                tagSection.tags.forEach((t: any) => {
                  if (t.label) genres.push(t.label);
                });
              } else if (tagSection.label) {
                // Flat tag structure
                genres.push(tagSection.label);
              }
            });
          }

          // Convert to Manga format
          const mangaData: Manga = {
            id: mangaId,
            title: details.titles?.[0] || 'Unknown',
            author: details.author || 'Unknown',
            artist: details.artist,
            description: details.desc || '',
            coverImage: details.image || '',
            genres,
            status: (details.status?.toLowerCase() as 'ongoing' | 'completed' | 'hiatus') || 'ongoing',
            chapters: chapters.map((ch, idx) => ({
              id: ch.id,
              mangaId: mangaId,
              number: ch.chapNum || idx + 1,
              title: ch.name || `Chapter ${ch.chapNum || idx + 1}`,
              pages: [],
              releaseDate: ch.time || new Date().toISOString(),
              isRead: false,
            })),
            lastUpdated: new Date().toISOString(),
            source: sourceId,
          };
          setManga(mangaData);
        }
      } else {
        // Fallback to mock data
        const data = await getMangaById(mangaId);
        if (data) {
          setManga(data);
        }
      }
    } catch (error) {
      console.error('Failed to load manga:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLibraryToggle = async () => {
    if (!manga) return;
    if (inLibrary) {
      await removeFromLibrary(manga.id);
    } else {
      await addToLibrary(manga);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!manga) return;
    if (!inLibrary) {
      await addToLibrary(manga);
    }
    await toggleFavorite(manga.id);
  };

  const openReader = (chapterId: string) => {
    if (!manga) return;
    console.log('[MangaDetail] openReader called with chapterId:', chapterId, 'sourceId:', sourceId);
    navigation.navigate('Reader', { mangaId: manga.id, chapterId, sourceId });
  };

  const continueReading = () => {
    if (!manga) return;
    console.log('[MangaDetail] continueReading - chapters count:', manga.chapters.length);
    if (manga.chapters.length > 0) {
      console.log('[MangaDetail] First chapter:', manga.chapters[0]);
      console.log('[MangaDetail] Last chapter:', manga.chapters[manga.chapters.length - 1]);
    }
    if (progress) {
      console.log('[MangaDetail] Continuing from progress:', progress.chapterId);
      openReader(progress.chapterId);
    } else if (manga.chapters.length > 0) {
      // Start from the last chapter (first in reading order - oldest)
      const firstChapter = manga.chapters[manga.chapters.length - 1];
      console.log('[MangaDetail] Starting from first chapter:', firstChapter.id);
      openReader(firstChapter.id);
    }
  };

  if (loading) {
    return <LoadingIndicator fullScreen message="Loading manga details..." />;
  }

  if (!manga) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>
          Manga not found
        </Text>
      </View>
    );
  }

  const sortedChapters = sortDescending
    ? [...manga.chapters].reverse()
    : manga.chapters;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Cover */}
        <View style={styles.header}>
          <Image
            source={{ uri: manga.coverImage }}
            style={styles.coverBackground}
            blurRadius={20}
          />
          <View style={styles.headerOverlay} />

          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.card }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Image
              source={{ uri: manga.coverImage }}
              style={styles.coverImage}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.mangaTitle}>{manga.title}</Text>
              <Text style={styles.mangaAuthor}>{manga.author}</Text>
              {manga.artist && manga.artist !== manga.author && (
                <Text style={styles.mangaArtist}>Art: {manga.artist}</Text>
              )}
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: manga.status === 'completed' ? theme.success : theme.primary }
                ]}>
                  <Text style={styles.statusText}>
                    {manga.status.toUpperCase()}
                  </Text>
                </View>
                {manga.rating && (
                  <Text style={styles.rating}>⭐ {manga.rating}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={continueReading}
          >
            <Text style={styles.actionButtonText}>
              {progress ? 'Continue Reading' : 'Start Reading'}
            </Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card }]}
              onPress={handleLibraryToggle}
            >
              <Text style={styles.iconButtonText}>
                {inLibrary ? '📖' : '➕'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card }]}
              onPress={handleFavoriteToggle}
            >
              <Text style={styles.iconButtonText}>
                {favorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Genres */}
        <View style={styles.genresContainer}>
          {manga.genres.map(genre => (
            <TouchableOpacity
              key={genre}
              style={[styles.genreTag, { backgroundColor: theme.card }]}
              onPress={() => {
                navigation.navigate('Main', {
                  screen: 'Search',
                  params: { initialQuery: genre }
                } as any);
              }}
            >
              <Ionicons name="search" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.genreText, { color: theme.text }]}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Synopsis
          </Text>
          <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
            <LinkifiedText
              text={manga.description}
              style={[styles.description, { color: theme.textSecondary }]}
              numberOfLines={showFullDescription ? undefined : 3}
            />
            <Text style={[styles.showMore, { color: theme.primary }]}>
              {showFullDescription ? 'Show less' : 'Show more'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chapters */}
        <View style={styles.section}>
          <View style={styles.chapterHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Chapters ({manga.chapters.length})
            </Text>
            <TouchableOpacity onPress={handleSortToggle}>
              <Text style={[styles.sortButton, { color: theme.primary }]}>
                {sortDescending ? '↓ Newest' : '↑ Oldest'}
              </Text>
            </TouchableOpacity>
          </View>

          {sortedChapters.map(chapter => (
            <ChapterListItem
              key={chapter.id}
              chapter={chapter}
              onPress={() => openReader(chapter.id)}
              isRead={progress?.chapterId === chapter.id}
            />
          ))}
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
    height: 300,
    position: 'relative',
  },
  coverBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
  },
  coverImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'flex-end',
  },
  mangaTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mangaAuthor: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  mangaArtist: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rating: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 24,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  genreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  showMore: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  moreChapters: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
