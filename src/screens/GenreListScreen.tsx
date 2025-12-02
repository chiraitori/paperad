import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';

type GenreListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GenreList'>;
type GenreListScreenRouteProp = RouteProp<RootStackParamList, 'GenreList'>;

const { width } = Dimensions.get('window');
const GENRE_CARD_WIDTH = (width - 48) / 2;

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

export const GenreListScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<GenreListScreenNavigationProp>();
  const route = useRoute<GenreListScreenRouteProp>();
  const { sourceId, tags } = route.params;

  const navigateToGenre = (tag: { id: string; label: string }) => {
    navigation.navigate('Category', {
      sourceId: sourceId,
      sectionId: `genre-${tag.id}`,
      title: tag.label,
      tagId: tag.id,
    });
  };

  const renderGenreCard = (tag: { id: string; label: string }, index: number) => {
    const color = GENRE_COLORS[index % GENRE_COLORS.length];
    
    return (
      <TouchableOpacity
        key={tag.id}
        style={[styles.genreCard, { backgroundColor: color }]}
        onPress={() => navigateToGenre(tag)}
        activeOpacity={0.8}
      >
        <Text style={styles.genreText} numberOfLines={2}>{tag.label}</Text>
        <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>All Genres</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.genresGrid}>
          {tags.map((tag, index) => renderGenreCard(tag, index))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreCard: {
    width: GENRE_CARD_WIDTH,
    paddingVertical: 24,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
});
