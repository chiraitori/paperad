import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Platform,
    Dimensions,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { Manga } from '../types';
import { getMangaDetails, getChapters } from '../services/sourceService';
import * as Haptics from 'expo-haptics';

interface MangaPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    manga: Manga | null;
    sourceId?: string;
    onReadNow?: (manga: Manga, chapterId: string) => void;
    onAddToLibrary?: (manga: Manga) => void;
    onRemoveFromLibrary?: (mangaId: string) => void;
    onViewDetails?: (manga: Manga) => void;
    onToggleFavorite?: (mangaId: string) => void;
    isInLibrary?: boolean;
    isFavorite?: boolean;
}

interface ChapterInfo {
    id: string;
    name: string;
    chapNum: number;
    pageCount?: number;
}

// Action item for the context menu
interface ActionItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    destructive?: boolean;
    disabled?: boolean;
}

export const MangaPreviewModal: React.FC<MangaPreviewModalProps> = ({
    visible,
    onClose,
    manga,
    sourceId,
    onReadNow,
    onAddToLibrary,
    onRemoveFromLibrary,
    onViewDetails,
    onToggleFavorite,
    isInLibrary = false,
    isFavorite = false,
}) => {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [chapters, setChapters] = useState<ChapterInfo[]>([]);
    const [totalChapters, setTotalChapters] = useState<number>(0); // Total chapter count
    const [fullDetails, setFullDetails] = useState<any>(null);

    // Trigger haptic feedback when modal opens
    useEffect(() => {
        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [visible]);

    // Lazy load details when modal becomes visible
    useEffect(() => {
        if (visible && manga && sourceId) {
            loadDetails();
        }
        if (!visible) {
            // Reset state when closed
            setChapters([]);
            setTotalChapters(0);
            setFullDetails(null);
        }
    }, [visible, manga?.id, sourceId]);

    const loadDetails = async () => {
        if (!manga || !sourceId) return;

        setLoading(true);
        try {
            const [details, chaptersData] = await Promise.all([
                getMangaDetails(sourceId, manga.id),
                getChapters(sourceId, manga.id),
            ]);

            setFullDetails(details);
            setTotalChapters(chaptersData.length); // Store total count
            setChapters(chaptersData.slice(0, 10).map((ch: any) => ({
                id: ch.id,
                name: ch.name || `Chapter ${ch.chapNum}`,
                chapNum: ch.chapNum,
                pageCount: ch.pageCount,
            })));
        } catch (error) {
            console.error('Failed to load preview details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReadNow = () => {
        if (manga && chapters.length > 0 && onReadNow) {
            const firstChapter = chapters[chapters.length - 1];
            onReadNow(manga, firstChapter.id);
        }
        onClose();
    };

    const handleViewDetails = () => {
        if (manga && onViewDetails) {
            onViewDetails(manga);
        }
        onClose();
    };

    const handleAddToLibrary = () => {
        if (manga && onAddToLibrary) {
            onAddToLibrary(manga);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onClose();
    };

    const handleRemoveFromLibrary = () => {
        if (manga && onRemoveFromLibrary) {
            onRemoveFromLibrary(manga.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        onClose();
    };

    const handleToggleFavorite = () => {
        if (manga && onToggleFavorite) {
            onToggleFavorite(manga.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    if (!manga) return null;

    const getStatusColor = () => {
        if (manga.status === 'completed') return theme.success;
        return theme.primary;
    };

    const description = fullDetails?.desc || manga.description || '';

    // Build action items based on context
    const actionItems: ActionItem[] = [
        {
            icon: 'information-circle-outline',
            label: 'View Details',
            onPress: handleViewDetails,
        },
        {
            icon: chapters.length > 0 ? 'book' : 'book-outline',
            label: chapters.length > 0 ? 'Start Reading' : 'Loading...',
            onPress: handleReadNow,
            disabled: chapters.length === 0,
        },
        {
            icon: isFavorite ? 'heart' : 'heart-outline',
            label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
            onPress: handleToggleFavorite,
        },
        isInLibrary ? {
            icon: 'trash-outline',
            label: 'Remove from Library',
            onPress: handleRemoveFromLibrary,
            destructive: true,
        } : {
            icon: 'add-circle-outline',
            label: 'Add to Library',
            onPress: handleAddToLibrary,
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                {/* Tap to close */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                {/* Content container */}
                <View style={[styles.container, { maxWidth: Math.min(width * 0.92, 420) }]}>
                    {/* Preview Card */}
                    <View style={[styles.previewCard, { backgroundColor: theme.card }]}>
                        {/* Header with cover and info */}
                        <View style={styles.header}>
                            <Image
                                source={{ uri: manga.coverImage }}
                                style={styles.coverImage}
                                resizeMode="cover"
                            />
                            <View style={styles.headerInfo}>
                                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                                    {manga.title}
                                </Text>
                                <Text style={[styles.author, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {manga.author || 'Unknown Author'}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                                    <Text style={styles.statusText}>
                                        {manga.status?.toUpperCase() || 'UNKNOWN'}
                                    </Text>
                                </View>

                                {/* Stats row */}
                                <View style={styles.statsRow}>
                                    <Ionicons name="book-outline" size={14} color={theme.textSecondary} />
                                    <Text style={[styles.statsText, { color: theme.textSecondary }]}>
                                        {loading ? 'Loading...' : `${totalChapters > 0 ? totalChapters : manga.chapters?.length || '?'} chapters`}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Description */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                                    Loading...
                                </Text>
                            </View>
                        ) : description ? (
                            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
                                {description}
                            </Text>
                        ) : null}
                    </View>

                    {/* iOS-style Action Menu */}
                    <View style={[styles.actionMenu, { backgroundColor: theme.card }]}>
                        {actionItems.map((item, index) => (
                            <React.Fragment key={item.label}>
                                <TouchableOpacity
                                    style={[
                                        styles.actionItem,
                                        item.disabled && styles.actionItemDisabled,
                                    ]}
                                    onPress={item.onPress}
                                    disabled={item.disabled}
                                    activeOpacity={0.6}
                                >
                                    <Ionicons
                                        name={item.icon}
                                        size={22}
                                        color={item.destructive ? theme.error : item.disabled ? theme.textSecondary : theme.primary}
                                    />
                                    <Text style={[
                                        styles.actionLabel,
                                        { color: item.destructive ? theme.error : item.disabled ? theme.textSecondary : theme.text }
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                                {index < actionItems.length - 1 && (
                                    <View style={[styles.separator, { backgroundColor: theme.border }]} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>

                    {/* Cancel button */}
                    <TouchableOpacity
                        style={[styles.cancelButton, { backgroundColor: theme.card }]}
                        onPress={onClose}
                        activeOpacity={0.6}
                    >
                        <Text style={[styles.cancelText, { color: theme.primary }]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 34,
        paddingHorizontal: 8,
    },
    container: {
        width: '100%',
        gap: 8,
    },
    previewCard: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 0,
    },
    header: {
        flexDirection: 'row',
    },
    coverImage: {
        width: 80,
        height: 120,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'flex-start',
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    author: {
        fontSize: 14,
        marginBottom: 8,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statsText: {
        fontSize: 13,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 12,
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 12,
    },
    actionMenu: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    actionItemDisabled: {
        opacity: 0.5,
    },
    actionLabel: {
        fontSize: 17,
        flex: 1,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 50,
    },
    cancelButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 17,
        fontWeight: '600',
    },
});
