import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { getChapterPages, getMangaDetails, getChapters, decryptDrmImage } from '../services/sourceService';
import { Manga, Chapter, Page, RootStackParamList } from '../types';
import { t } from '../services/i18nService';

type ReaderRouteProp = RouteProp<RootStackParamList, 'Reader'>;
type ReaderNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

// Info Modal Component - Paperback Style
const InfoModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  manga: Manga | null;
  chapter: Chapter | null;
  currentPage: number;
  totalPages: number;
  onContinueReading: () => void;
  onSearchTag: (tag: string) => void;
}> = ({ visible, onClose, manga, chapter, currentPage, totalPages, onContinueReading, onSearchTag }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { theme } = useTheme(); // Must be before any early returns

  if (!manga || !chapter) return null;

  const handleContinue = () => {
    onClose();
    onContinueReading();
  };

  const handleTagPress = (tag: string) => {
    onClose();
    onSearchTag(tag);
  };

  const getStatusColor = () => {
    if (manga.status === 'completed') return theme.success;
    return theme.primary; // Default to primary (blue) for ongoing/other
  };

  const getStatusText = () => {
    const status = manga?.status?.toLowerCase();
    if (status && ['ongoing', 'completed', 'hiatus', 'unknown'].includes(status)) {
      return t(`manga.${status}`).toUpperCase();
    }
    return t('manga.unknown').toUpperCase();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.infoModalContainer}>
        <TouchableOpacity
          style={styles.infoModalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.infoModalContent}>
          {/* Close button */}
          <TouchableOpacity style={styles.infoModalClose} onPress={onClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            style={styles.infoModalScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Header - Cover Left, Info Right */}
            <View style={styles.infoModalHeader}>
              <Image
                source={{ uri: manga.coverImage }}
                style={styles.infoModalCover}
                resizeMode="cover"
              />
              <View style={styles.infoModalHeaderInfo}>
                <Text style={styles.infoModalTitle} numberOfLines={3}>{manga.title}</Text>
                <Text style={styles.infoModalAuthor}>{manga.author || 'Unknown'}</Text>
                <View style={[styles.infoModalStatusBadge, { backgroundColor: getStatusColor() }]}>
                  <Text style={styles.infoModalStatusBadgeText}>{getStatusText()}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.infoModalButtons}>
              <TouchableOpacity style={styles.infoModalReadButton} onPress={handleContinue}>
                <Ionicons name="book" size={18} color="#000" />
                <Text style={styles.infoModalReadButtonText}>
                  {t('reader.chapter')} {chapter.number} • {currentPage + 1}/{totalPages}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoModalIconButton}>
                <Ionicons name="bookmark-outline" size={24} color="#FA6432" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoModalIconButton}>
                <Ionicons name="share-outline" size={24} color="#FA6432" />
              </TouchableOpacity>
            </View>

            {/* Description */}
            {manga.description && (
              <View style={styles.infoModalDescSection}>
                <TouchableOpacity
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={styles.infoModalDescription}
                    numberOfLines={showFullDescription ? undefined : 4}
                  >
                    {manga.description}
                  </Text>
                  <Text style={styles.infoModalMoreButton}>
                    {showFullDescription ? t('manga.showLess') : t('manga.showMore')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tags Section */}
            {manga.genres && manga.genres.length > 0 && (
              <View style={styles.infoModalTagsSection}>
                <View style={styles.infoModalTagsLabelContainer}>
                  <Text style={styles.infoModalTagsLabel}>{t('reader.tags')}</Text>
                </View>
                <View style={styles.infoModalGenres}>
                  {manga.genres.map((genre, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.infoModalGenreTag}
                      onPress={() => handleTagPress(genre)}
                    >
                      <Ionicons name="search" size={12} color="#888" style={{ marginRight: 4 }} />
                      <Text style={styles.infoModalGenreText}>{genre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Reader Settings Modal Component
const ReaderSettingsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  readingMode: 'vertical' | 'horizontal';
  setReadingMode: (mode: 'vertical' | 'horizontal') => void;
  readingDirection: 'ltr' | 'rtl';
  setReadingDirection: (dir: 'ltr' | 'rtl') => void;
  pagePadding: boolean;
  setPagePadding: (val: boolean) => void;
}> = ({
  visible, onClose,
  readingMode, setReadingMode,
  readingDirection, setReadingDirection,
  pagePadding, setPagePadding,
}) => {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.settingsModalContainer}>
          <TouchableOpacity
            style={styles.settingsModalBackdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>{t('reader.settingsTitle')}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.settingsDoneButton}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsScrollView}>
              {/* Reader Type */}
              <Text style={styles.settingsSectionTitle}>{t('reader.readerType')}</Text>
              <View style={styles.settingsSegmentContainer}>
                <TouchableOpacity
                  style={[
                    styles.settingsSegment,
                    readingMode === 'vertical' && styles.settingsSegmentActive,
                  ]}
                  onPress={() => setReadingMode('vertical')}
                >
                  <Text style={[
                    styles.settingsSegmentText,
                    readingMode === 'vertical' && styles.settingsSegmentTextActive,
                  ]}>{t('reader.vertical')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsSegment,
                    readingMode === 'horizontal' && styles.settingsSegmentActive,
                  ]}
                  onPress={() => setReadingMode('horizontal')}
                >
                  <Text style={[
                    styles.settingsSegmentText,
                    readingMode === 'horizontal' && styles.settingsSegmentTextActive,
                  ]}>{t('reader.horizontal')}</Text>
                </TouchableOpacity>
              </View>

              {/* Reading Direction (for horizontal mode) */}
              {readingMode === 'horizontal' && (
                <>
                  <Text style={styles.settingsSectionTitle}>{t('reader.readingDirection')}</Text>
                  <View style={styles.settingsSegmentContainer}>
                    <TouchableOpacity
                      style={[
                        styles.settingsSegment,
                        readingDirection === 'ltr' && styles.settingsSegmentActive,
                      ]}
                      onPress={() => setReadingDirection('ltr')}
                    >
                      <Text style={[
                        styles.settingsSegmentText,
                        readingDirection === 'ltr' && styles.settingsSegmentTextActive,
                      ]}>{t('reader.ltr')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.settingsSegment,
                        readingDirection === 'rtl' && styles.settingsSegmentActive,
                      ]}
                      onPress={() => setReadingDirection('rtl')}
                    >
                      <Text style={[
                        styles.settingsSegmentText,
                        readingDirection === 'rtl' && styles.settingsSegmentTextActive,
                      ]}>{t('reader.rtl')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* General Settings */}
              <Text style={styles.settingsSectionTitle}>{t('reader.generalSettings')}</Text>
              <View style={styles.settingsCard}>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsRowLabel}>{t('reader.pagePadding')}</Text>
                  <Switch
                    value={pagePadding}
                    onValueChange={setPagePadding}
                    trackColor={{ false: '#3e3e3e', true: '#FA6432' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };


// Parse DRM URL to get extensionId and actual URL
const parseDrmUrl = (url: string): { extensionId: string; actualUrl: string } | null => {
  if (!url.startsWith('drm://')) return null;
  const withoutScheme = url.substring(6); // Remove 'drm://'
  const slashIndex = withoutScheme.indexOf('/');
  if (slashIndex === -1) return null;
  return {
    extensionId: withoutScheme.substring(0, slashIndex),
    actualUrl: withoutScheme.substring(slashIndex + 1),
  };
};

// Component for auto-sizing images with progressive loading and DRM support
const AutoSizeImage: React.FC<{
  uri: string;
  onPress: () => void;
  pageNumber: number;
  totalPages: number;
}> = ({ uri, onPress, pageNumber, totalPages }) => {
  const { width: screenWidth } = useWindowDimensions();
  const [imageHeight, setImageHeight] = useState(screenWidth * 1.4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actualUri, setActualUri] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  // Update image height when screen width changes (orientation change)
  useEffect(() => {
    if (actualUri) {
      Image.getSize(
        actualUri,
        (w, h) => {
          const ratio = screenWidth / w;
          setImageHeight(h * ratio);
        },
        () => {
          setImageHeight(screenWidth * 1.4);
        }
      );
    } else {
      setImageHeight(screenWidth * 1.4);
    }
  }, [screenWidth, actualUri]);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      setLoading(true);
      setError(false);
      setActualUri(null);

      // Check if this is a DRM URL that needs decryption
      const drmInfo = parseDrmUrl(uri);
      if (drmInfo) {
        setDecrypting(true);
        try {
          const decryptedUrl = await decryptDrmImage(drmInfo.extensionId, drmInfo.actualUrl);
          if (!mounted) return;

          if (decryptedUrl) {
            setActualUri(decryptedUrl);
            // Get image size from decrypted data URL
            Image.getSize(
              decryptedUrl,
              (w, h) => {
                if (!mounted) return;
                const ratio = screenWidth / w;
                setImageHeight(h * ratio);
                setLoading(false);
              },
              () => {
                if (!mounted) return;
                setImageHeight(screenWidth * 1.4);
                setLoading(false);
              }
            );
          } else {
            setError(true);
            setLoading(false);
          }
        } catch (e) {
          if (!mounted) return;
          setError(true);
          setLoading(false);
        } finally {
          if (mounted) setDecrypting(false);
        }
      } else {
        // Normal URL
        setActualUri(uri);
        Image.getSize(
          uri,
          (w, h) => {
            if (!mounted) return;
            const ratio = screenWidth / w;
            setImageHeight(h * ratio);
            setLoading(false);
          },
          () => {
            if (!mounted) return;
            setImageHeight(screenWidth * 1.4);
            setLoading(false);
            setError(true);
          }
        );
      }
    };

    loadImage();
    return () => { mounted = false; };
  }, [uri, screenWidth]);

  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress}>
      <View style={{ width: screenWidth, minHeight: imageHeight, justifyContent: 'center', alignItems: 'center' }}>
        {(loading || decrypting) && (
          <View style={styles.pageLoadingContainer}>
            <ActivityIndicator size="small" color="#FA6432" />
            <Text style={styles.pageLoadingText}>
              {decrypting ? t('common.decryptingPage', { page: pageNumber }) : t('common.loadingPage', { current: pageNumber, total: totalPages })}
            </Text>
          </View>
        )}
        {error ? (
          <View style={styles.pageErrorContainer}>
            <Ionicons name="image-outline" size={40} color="#555" />
            <Text style={styles.pageErrorText}>{t('reader.failedToLoadPage', { page: pageNumber })}</Text>
          </View>
        ) : actualUri ? (
          <Image
            source={{ uri: actualUri }}
            style={{ width: screenWidth, height: imageHeight }}
            resizeMode="contain"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

// Horizontal mode page component with DRM support
const HorizontalPageImage: React.FC<{
  uri: string;
  pageNumber: number;
  totalPages: number;
  onPress: () => void;
}> = ({ uri, pageNumber, totalPages, onPress }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actualUri, setActualUri] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      setLoading(true);
      setError(false);

      const drmInfo = parseDrmUrl(uri);
      if (drmInfo) {
        setDecrypting(true);
        try {
          const decryptedUrl = await decryptDrmImage(drmInfo.extensionId, drmInfo.actualUrl);
          if (!mounted) return;
          if (decryptedUrl) {
            setActualUri(decryptedUrl);
            setLoading(false);
          } else {
            setError(true);
            setLoading(false);
          }
        } catch (e) {
          if (!mounted) return;
          setError(true);
          setLoading(false);
        } finally {
          if (mounted) setDecrypting(false);
        }
      } else {
        setActualUri(uri);
        setLoading(false);
      }
    };

    loadImage();
    return () => { mounted = false; };
  }, [uri]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={styles.horizontalPage}
    >
      {(loading || decrypting) ? (
        <View style={styles.horizontalLoadingContainer}>
          <ActivityIndicator size="large" color="#FA6432" />
          <Text style={styles.pageLoadingText}>
            {decrypting ? t('common.decryptingPage', { page: pageNumber }) : t('common.loading')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.horizontalLoadingContainer}>
          <Ionicons name="image-outline" size={48} color="#555" />
          <Text style={styles.pageErrorText}>{t('reader.failedToLoadPage', { page: pageNumber })}</Text>
        </View>
      ) : actualUri ? (
        <Image
          source={{ uri: actualUri }}
          style={styles.horizontalImage}
          resizeMode="contain"
          onError={() => setError(true)}
        />
      ) : null}
      <View style={styles.horizontalPageIndicator}>
        <Text style={styles.horizontalPageText}>{pageNumber} / {totalPages}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Chapter transition component
const ChapterTransition: React.FC<{
  type: 'previous' | 'next';
  chapter: Chapter | null;
  manga: Manga | null;
  isLoading: boolean;
  onNavigate: () => void;
}> = ({ type, chapter, manga, isLoading, onNavigate }) => {
  const isPrevious = type === 'previous';

  if (!chapter) {
    return (
      <View style={styles.transitionContainer}>
        <View style={styles.transitionContent}>
          <Ionicons
            name={isPrevious ? "chevron-up" : "checkmark-circle"}
            size={40}
            color="#666"
          />
          <Text style={styles.transitionTitle}>
            {isPrevious ? t('reader.noPreviousChapter') : t('reader.caughtUp')}
          </Text>
          <Text style={styles.transitionSubtitle}>
            {isPrevious
              ? t('reader.firstChapter')
              : t('reader.latestChapter')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.transitionContainer}
      onPress={onNavigate}
      activeOpacity={0.8}
    >
      <View style={styles.transitionContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#FA6432" />
        ) : (
          <>
            <Ionicons
              name={isPrevious ? "chevron-up" : "chevron-down"}
              size={32}
              color="#FA6432"
            />
            <Text style={styles.transitionLabel}>
              {isPrevious ? t('reader.previousChapter') : t('reader.nextChapter')}
            </Text>
            <Text style={styles.transitionChapterTitle}>
              {t('reader.chapter')} {chapter.number}{chapter.title ? ` - ${chapter.title}` : ''}
            </Text>
            <View style={styles.transitionButton}>
              <Text style={styles.transitionButtonText}>
                {isPrevious ? t('reader.goToPrevious') : t('manga.continueReading')}
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const ReaderScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<ReaderRouteProp>();
  const navigation = useNavigation<ReaderNavigationProp>();
  const { updateProgress, addToLibrary, library } = useLibrary();

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [readingMode, setReadingMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [pages, setPages] = useState<Page[]>([]);
  const [loadedPages, setLoadedPages] = useState<Page[]>([]); // Progressive loading
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [allPagesLoaded, setAllPagesLoaded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Modal states
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Reader settings
  const [readingDirection, setReadingDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [pagePadding, setPagePadding] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { mangaId, chapterId, sourceId } = route.params;

  // Check if manga is in library
  useEffect(() => {
    if (manga) {
      const inLibrary = library.some(item => item.manga.id === manga.id);
      setIsBookmarked(inLibrary);
    }
  }, [manga, library]);

  useEffect(() => {
    loadData();
  }, [mangaId, chapterId]);

  const toggleBookmark = async () => {
    if (!manga) return;

    if (!isBookmarked) {
      await addToLibrary(manga);
      setIsBookmarked(true);
    }
    // Note: We don't remove from library here, that should be done from library screen
  };

  const startControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      hideControls();
    }, 3000);
  };

  useEffect(() => {
    if (showControls) {
      startControlsTimer();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const loadData = async () => {
    try {
      setLoading(true);

      console.log('[Reader] loadData called with:', { mangaId, chapterId, sourceId });

      // If sourceId is provided, load from extension
      if (sourceId) {
        console.log('[Reader] Loading from extension:', sourceId, mangaId, chapterId);

        // Fetch manga details and chapters from extension for proper history tracking
        const [pageUrls, mangaDetails, chaptersData] = await Promise.all([
          getChapterPages(sourceId, mangaId, chapterId),
          getMangaDetails(sourceId, mangaId),
          getChapters(sourceId, mangaId),
        ]);

        console.log('[Reader] Got pages:', pageUrls.length);
        console.log('[Reader] First 3 page URLs:', pageUrls.slice(0, 3));

        if (pageUrls.length > 0) {
          // Find the current chapter info
          const currentChapter = chaptersData.find(ch => ch.id === chapterId);

          // Parse tags - they can be nested in sections (same logic as MangaDetailScreen)
          let genres: string[] = [];
          if (mangaDetails?.tags) {
            mangaDetails.tags.forEach((tagSection: any) => {
              if (tagSection.tags && Array.isArray(tagSection.tags)) {
                // Nested tags structure
                tagSection.tags.forEach((t: any) => {
                  if (t.label) genres.push(t.label);
                });
              } else if (tagSection.label) {
                // Direct tag structure
                genres.push(tagSection.label);
              }
            });
          }

          // Create a proper manga object with real data for library/history
          const mangaData: Manga = {
            id: mangaId,
            title: mangaDetails?.titles?.[0] || 'Unknown Manga',
            author: mangaDetails?.author || '',
            description: mangaDetails?.desc || '',
            coverImage: mangaDetails?.image || '',
            genres: genres,
            status: mangaDetails?.status?.toLowerCase() || 'ongoing',
            chapters: chaptersData.map(ch => ({
              id: ch.id,
              mangaId: mangaId,
              number: ch.chapNum,
              title: ch.name || `Chapter ${ch.chapNum}`,
              pages: [],
              releaseDate: ch.time || new Date().toISOString(),
              isRead: false,
            })),
            lastUpdated: new Date().toISOString(),
            source: sourceId,
          };
          setManga(mangaData);

          // Create chapter object
          const chapterData: Chapter = {
            id: chapterId,
            mangaId: mangaId,
            number: currentChapter?.chapNum || 1,
            title: currentChapter?.name || 'Chapter',
            pages: [],
            releaseDate: currentChapter?.time || new Date().toISOString(),
            isRead: false,
          };
          setChapter(chapterData);

          // Convert page URLs to Page objects - ensure unique keys
          const pageData: Page[] = pageUrls.map((url, index) => ({
            id: `${chapterId}-page-${index}`,
            chapterId: chapterId,
            pageNumber: index + 1,
            imageUrl: url,
          }));
          console.log('[Reader] Created page data:', pageData.length, 'pages');
          console.log('[Reader] First page:', pageData[0]?.id, pageData[0]?.imageUrl?.substring(0, 50));
          setPages(pageData);
          // Start with first 3 pages for progressive loading
          setLoadedPages(pageData.slice(0, 3));
          setAllPagesLoaded(pageData.length <= 3);
        }
      } else {
        // No sourceId provided - cannot load chapter
        console.error('[Reader] No sourceId provided for chapter:', mangaId, chapterId);
      }
    } catch (error) {
      console.error('Failed to load reader data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hideControls = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  };

  const showControlsWithTimer = () => {
    setShowControls(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    startControlsTimer();
  };

  const toggleControls = () => {
    if (showControls) {
      hideControls();
    } else {
      showControlsWithTimer();
    }
  };

  const saveProgress = useCallback(async (pageNum: number) => {
    if (!manga || !chapter) return;

    await updateProgress({
      mangaId: manga.id,
      chapterId: chapter.id,
      pageNumber: pageNum,
      lastRead: new Date().toISOString(),
    }, manga);
  }, [manga, chapter, updateProgress]);

  // Load more pages progressively as user reads
  const loadMorePages = useCallback(() => {
    if (allPagesLoaded || pages.length === 0) return;

    setLoadedPages(prev => {
      // Check if we already have all pages
      if (prev.length >= pages.length) {
        setAllPagesLoaded(true);
        return prev;
      }

      const nextBatch = pages.slice(prev.length, prev.length + 3);
      if (nextBatch.length === 0) {
        setAllPagesLoaded(true);
        return prev;
      }

      const newPages = [...prev, ...nextBatch];
      if (newPages.length >= pages.length) {
        setAllPagesLoaded(true);
      }
      return newPages;
    });
  }, [pages, allPagesLoaded]);

  // Get adjacent chapters
  const getAdjacentChapters = useCallback(() => {
    if (!manga || !chapter) return { previous: null, next: null };

    const currentIndex = manga.chapters.findIndex(ch => ch.id === chapter.id);
    // Chapters are sorted descending (newest first)
    // Previous (older) = higher index
    // Next (newer) = lower index
    const previous = currentIndex < manga.chapters.length - 1 ? manga.chapters[currentIndex + 1] : null;
    const next = currentIndex > 0 ? manga.chapters[currentIndex - 1] : null;

    return { previous, next };
  }, [manga, chapter]);

  const { previous: previousChapter, next: nextChapter } = getAdjacentChapters();

  const goToPreviousChapter = () => {
    if (!previousChapter || !manga || isTransitioning) return;
    setIsTransitioning(true);
    navigation.replace('Reader', { mangaId: manga.id, chapterId: previousChapter.id, sourceId });
  };

  const goToNextChapter = () => {
    if (!nextChapter || !manga || isTransitioning) return;
    setIsTransitioning(true);
    navigation.replace('Reader', { mangaId: manga.id, chapterId: nextChapter.id, sourceId });
  };

  const renderPage = ({ item, index }: { item: Page; index: number }) => {
    if (readingMode === 'vertical') {
      return (
        <AutoSizeImage
          key={item.id}
          uri={item.imageUrl}
          onPress={toggleControls}
          pageNumber={item.pageNumber}
          totalPages={pages.length}
        />
      );
    }

    // Horizontal mode - also need to handle DRM
    return (
      <HorizontalPageImage
        key={item.id}
        uri={item.imageUrl}
        pageNumber={item.pageNumber}
        totalPages={pages.length}
        onPress={toggleControls}
      />
    );
  };

  // Header component for previous chapter
  const ListHeaderComponent = () => (
    <ChapterTransition
      type="previous"
      chapter={previousChapter}
      manga={manga}
      isLoading={isTransitioning}
      onNavigate={goToPreviousChapter}
    />
  );

  // Footer component for next chapter
  const ListFooterComponent = () => (
    <ChapterTransition
      type="next"
      chapter={nextChapter}
      manga={manga}
      isLoading={isTransitioning}
      onNavigate={goToNextChapter}
    />
  );

  // Track page changes and trigger loading more pages
  const saveProgressRef = useRef(saveProgress);
  const loadMorePagesRef = useRef(loadMorePages);
  const loadedPagesCountRef = useRef(loadedPages.length);

  useEffect(() => {
    saveProgressRef.current = saveProgress;
    loadMorePagesRef.current = loadMorePages;
    loadedPagesCountRef.current = loadedPages.length;
  }, [saveProgress, loadMorePages, loadedPages.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      // Find the first item that's a page (not header/footer)
      const pageItem = viewableItems.find((item: any) => item.item?.pageNumber !== undefined);
      if (pageItem) {
        const newPage = pageItem.index;
        setCurrentPage(newPage);
        saveProgressRef.current(newPage);

        // Load more pages when user is near the end of loaded pages
        if (newPage >= loadedPagesCountRef.current - 2) {
          loadMorePagesRef.current();
        }
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Handle scroll for chapter transitions (vertical mode)
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollY = contentOffset.y;
    const maxScrollY = contentSize.height - layoutMeasurement.height;

    // Check if scrolled past the end (for next chapter)
    if (scrollY > maxScrollY + 100 && nextChapter && !isTransitioning) {
      goToNextChapter();
    }
  };

  // Handle horizontal scroll for page tracking and chapter transitions
  const handleHorizontalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const pageWidth = layoutMeasurement.width;
    const currentPageIndex = Math.round(scrollX / pageWidth);

    setCurrentPage(currentPageIndex);

    // Check for chapter transitions at boundaries
    const maxScrollX = contentSize.width - layoutMeasurement.width;

    // At first page and swiping left (RTL manga style - go to previous chapter)
    if (scrollX < -50 && previousChapter && !isTransitioning) {
      goToPreviousChapter();
    }
    // At last page and swiping right (go to next chapter)
    if (scrollX > maxScrollX + 50 && nextChapter && !isTransitioning) {
      goToNextChapter();
    }
  };

  // No loading screen - show content immediately even while loading
  // Only show error if we've finished loading and have no pages
  if (!loading && pages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <TouchableOpacity
          style={styles.backButtonFloat}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#666" />
          <Text style={styles.errorText}>No pages found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={!showControls} barStyle="light-content" />

      <FlatList
        ref={flatListRef}
        data={readingMode === 'horizontal' ? pages : loadedPages}
        renderItem={renderPage}
        keyExtractor={item => item.id}
        horizontal={readingMode === 'horizontal'}
        pagingEnabled={readingMode === 'horizontal'}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={false}
        ListHeaderComponent={readingMode === 'vertical' ? ListHeaderComponent : undefined}
        ListFooterComponent={readingMode === 'vertical' ? ListFooterComponent : undefined}
        onScroll={readingMode === 'horizontal' ? handleHorizontalScroll : handleScroll}
        scrollEventThrottle={16}
        bounces={true}
        onEndReached={readingMode === 'vertical' ? loadMorePages : undefined}
        onEndReachedThreshold={0.5}
      />

      {/* Back button - always accessible in horizontal mode */}
      {readingMode === 'horizontal' && !showControls && (
        <TouchableOpacity
          style={styles.horizontalBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Floating back button for vertical mode */}
      {readingMode === 'vertical' && !showControls && (
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Floating page indicator (always visible in vertical mode) */}
      {readingMode === 'vertical' && !showControls && (
        <View style={styles.floatingPageIndicator}>
          <Text style={styles.floatingPageText}>
            {currentPage + 1} / {pages.length}
          </Text>
        </View>
      )}

      {showControls && (
        <>
          {/* Top Bar - Paperback style */}
          <Animated.View
            style={[styles.topBar, { opacity: fadeAnim }]}
          >
            <View style={styles.topBarContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <Text style={styles.mangaTitle} numberOfLines={1}>
                  {manga?.title}
                </Text>
                <Text style={styles.chapterInfo}>
                  Ch. {chapter?.number}{chapter?.title ? ` - ${chapter.title}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowInfoModal(true)}
              >
                <Ionicons name="information-circle-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bottom Bar - Paperback style */}
          <Animated.View
            style={[styles.bottomBar, { opacity: fadeAnim }]}
          >
            {/* Reading mode toggle */}
            <View style={styles.bottomBarRow}>
              <TouchableOpacity
                style={styles.bottomButton}
                onPress={() => setReadingMode(readingMode === 'vertical' ? 'horizontal' : 'vertical')}
              >
                <Ionicons
                  name={readingMode === 'vertical' ? 'swap-horizontal' : 'swap-vertical'}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.bottomButton} onPress={toggleBookmark}>
                <Ionicons
                  name={isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={isBookmarked ? "#FA6432" : "#fff"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomButton}
                onPress={() => setShowSettingsModal(true)}
              >
                <Ionicons name="settings-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Chapter navigation */}
            <View style={styles.chapterNavRow}>
              <TouchableOpacity
                style={[styles.chapterNavButton, !previousChapter && styles.disabledButton]}
                onPress={goToPreviousChapter}
                disabled={!previousChapter}
              >
                <Ionicons name="chevron-back" size={20} color={previousChapter ? '#fff' : '#555'} />
              </TouchableOpacity>

              <View style={styles.pageIndicator}>
                <Text style={styles.pageIndicatorText}>
                  {currentPage + 1} of {pages.length}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.chapterNavButton, !nextChapter && styles.disabledButton]}
                onPress={goToNextChapter}
                disabled={!nextChapter}
              >
                <Ionicons name="chevron-forward" size={20} color={nextChapter ? '#fff' : '#555'} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </>
      )}

      {/* Info Modal */}
      <InfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        manga={manga}
        chapter={chapter}
        currentPage={currentPage}
        totalPages={pages.length}
        onContinueReading={() => { }}
        onSearchTag={(tag) => {
          // Navigate to Search tab in Main navigator with the tag
          navigation.navigate('Main', {
            screen: 'Search',
            params: { initialQuery: tag }
          } as any);
        }}
      />

      {/* Settings Modal */}
      <ReaderSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        readingMode={readingMode}
        setReadingMode={setReadingMode}
        readingDirection={readingDirection}
        setReadingDirection={setReadingDirection}
        pagePadding={pagePadding}
        setPagePadding={setPagePadding}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  horizontalPage: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalImage: {
    width: width,
    height: height,
  },

  // Transition styles
  transitionContainer: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  transitionContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  transitionLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transitionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  transitionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  transitionChapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  transitionButton: {
    backgroundColor: '#FA6432',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  transitionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonFloat: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    zIndex: 100,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  mangaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chapterInfo: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 2,
  },
  infoButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Floating page indicator
  floatingPageIndicator: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  floatingPageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 12,
  },
  bottomBarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  bottomButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  chapterNavButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  disabledButton: {
    opacity: 0.3,
  },
  pageIndicator: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  pageIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Page loading styles
  pageLoadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pageLoadingText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  pageErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#111',
  },
  pageErrorText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },

  // Horizontal mode indicator
  horizontalPageIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  horizontalPageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  horizontalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },

  // Info Modal Styles - Paperback Style
  infoModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  infoModalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  infoModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalScroll: {
    paddingHorizontal: 20,
  },
  infoModalHeader: {
    flexDirection: 'row',
    paddingTop: 20,
    marginBottom: 20,
    gap: 16,
  },
  infoModalCover: {
    width: 110,
    height: 160,
    borderRadius: 12,
  },
  infoModalHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 30,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  infoModalAuthor: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  infoModalStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoModalStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  infoModalButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  infoModalReadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD6E8',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  infoModalReadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  infoModalIconButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalDescSection: {
    marginBottom: 16,
  },
  infoModalDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#ccc',
  },
  infoModalMoreButton: {
    fontSize: 14,
    color: '#FA6432',
    marginTop: 6,
    textAlign: 'right',
  },
  infoModalTagsSection: {
    marginBottom: 20,
  },
  infoModalTagsLabelContainer: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  infoModalTagsLabel: {
    fontSize: 13,
    color: '#888',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoModalGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoModalGenreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  infoModalGenreText: {
    fontSize: 13,
    color: '#fff',
  },

  // Settings Modal Styles
  settingsModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  settingsModalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingsModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  settingsDoneButton: {
    fontSize: 17,
    color: '#FA6432',
    fontWeight: '600',
  },
  settingsScrollView: {
    paddingHorizontal: 20,
  },
  settingsSectionTitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingsSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 3,
  },
  settingsSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  settingsSegmentActive: {
    backgroundColor: '#4a4a4c',
  },
  settingsSegmentText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  settingsSegmentTextActive: {
    color: '#fff',
  },
  settingsCard: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingsRowLabel: {
    fontSize: 16,
    color: '#fff',
  },
});
